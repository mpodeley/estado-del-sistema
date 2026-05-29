#!/usr/bin/env python3
"""Scrape TGN ABII portal for nominations, capacity, restrictions and
delivered/injected volumes.

ABII is Java/JSF + PrimeFaces 7 — server-rendered with CSRF tokens,
ViewState and F5 ASM cookies. Driving it through a real browser with
Playwright avoids reimplementing JSF's stateful postback dance.

Configuration via env vars (GitHub Action secrets in production):
    TGN_USER             — visualisation account username
    TGN_PASSWORD         — visualisation account password

Local dev: leave them unset and the script no-ops cleanly.

This is the Phase-1 stub: it boots Playwright, logs in, persists the
session to raw/tgn_state.json, and exits. Per-section scrapers are
added in Phase 2 once we've mapped the portal's pages and selectors.
"""

import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _meta import write_json, write_csv, json_to_csv_path  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(ROOT, 'raw')
OUT_DIR = os.path.join(ROOT, 'public', 'data')
STATE_PATH = os.path.join(RAW_DIR, 'tgn_state.json')

BASE_URL = os.environ.get('TGN_BASE_URL', 'https://abii.tgn.com.ar/')
LOGIN_PATH = 'pages/login.xhtml'
# A path that requires auth — used both as a probe (to detect whether
# the session is still valid) and as the landing page after login.
PROBE_PATH = 'pages/home.xhtml'

SYSTEM_STATE_PATH = 'pages/reports/system_state/system-state-report.xhtml'


def env_credentials():
    user = (os.environ.get('TGN_USER') or '').strip()
    pw = (os.environ.get('TGN_PASSWORD') or '').strip()
    return user, pw


def login(page, user, pw):
    """Drive the JSF login form. The form id is `loginFormId` and the
    inputs are `loginFormId:username` and `loginFormId:password`."""
    page.fill('input[id="loginFormId:username"]', user)
    page.fill('input[id="loginFormId:password"]', pw)
    page.click('button[id^="loginFormId:"][type="submit"], '
               'input[id^="loginFormId:"][type="submit"]')
    page.wait_for_load_state('networkidle')


def scrape_system_state(page):
    """Open the Estado del Sistema report with ayer→hoy as the date
    range and 'all gasoductos' as the selection, then extract the
    resulting table into tgn_system_state.json.

    The page is server-rendered JSF. Filters live on a fixed-id form
    'formulario:'; date pickers use PrimeFaces calendar widgets and
    the gasoducto multi-select is a checkbox-style widget. We submit
    by clicking the 'Ver reporte' button and wait for the AJAX
    postback to settle before reading the result table.
    """
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    desde = yesterday.strftime('%d/%m/%Y')
    hasta = today.strftime('%d/%m/%Y')
    print(f'fetch_tgn: system_state range {desde} -> {hasta}')

    try:
        page.goto(BASE_URL + SYSTEM_STATE_PATH, wait_until='networkidle', timeout=30000)
    except Exception as e:
        print(f'fetch_tgn: failed to open system_state: {e}', file=sys.stderr)
        return

    # Wait for the page's JSF widgets to finish initialising — the
    # 'comunicación perdida' modal appears when a postback fires before
    # PrimeFaces is fully wired up.
    try:
        page.wait_for_selector(
            'button[id="formulario:report_btnSearch_id"]',
            state='visible', timeout=15000,
        )
        page.wait_for_timeout(1000)
    except Exception as e:
        print(f'fetch_tgn: report button never showed up: {e}', file=sys.stderr)
        return

    # The Gasoducto multi-select is required even though its label has
    # no asterisk — hitting 'Ver reporte' with nothing selected returns
    # an error via the JSF growl that surfaces as 'comunicación perdida'
    # because the server response wipes the postback target. Click the
    # 'Seleccionar Todos' button first to populate the field.
    try:
        page.click('button[id="formulario:report3_btnSelectAllOperators"]')
        page.wait_for_load_state('networkidle')
    except Exception as e:
        print(f'fetch_tgn: could not select all operators: {e}', file=sys.stderr)

    # Submit the report. Use the explicit JSF ID rather than role-based
    # lookup so we don't hit a different button with the same label.
    try:
        page.click('button[id="formulario:report_btnSearch_id"]')
        # PrimeFaces shows a spinner; wait for the grilla panel to be
        # repopulated rather than networkidle (postback can keep alive
        # connections open).
        page.wait_for_selector(
            'div[id="formulario:panelGrilla"] table',
            state='attached', timeout=30000,
        )
        page.wait_for_load_state('networkidle')
    except Exception as e:
        print(f'fetch_tgn: failed to run report: {e}', file=sys.stderr)
        return

    # Detect the 'communication lost' modal and bail with no rows.
    error_visible = page.eval_on_selector_all(
        'div.ui-messages-error, .ui-growl-message-error',
        'els => els.map(e => (e.textContent || "").trim()).filter(Boolean)',
    )
    if error_visible:
        print(f'fetch_tgn: server reported error(s): {error_visible[:3]}',
              file=sys.stderr)
        _save_system_state([], desde, hasta, [])
        return

    # The result lives in a table under the form. Dump every data table
    # on the page and pick the one with the most rows that doesn't
    # match the known filter/header panel ids.
    tables = page.eval_on_selector_all(
        'table',
        """els => els.map(t => ({
            id: t.id,
            cls: t.className.slice(0,80),
            rows: Array.from(t.rows).map(r =>
                Array.from(r.cells).map(c => (c.textContent || '').trim())
            )
        }))""",
    )
    # Skip filter/header/footer tables.
    skip_id_prefixes = ('headerForm:', 'formulario:panelFiltro',
                        'formulario:report_panelFiltro')
    candidates = [
        t for t in tables
        if not any((t.get('id') or '').startswith(p) for p in skip_id_prefixes)
        and len(t.get('rows') or []) >= 2
    ]
    candidates.sort(key=lambda t: len(t.get('rows') or []), reverse=True)
    if not candidates:
        print('fetch_tgn: no result table found in system_state', file=sys.stderr)
        _save_system_state([], desde, hasta, [])
        return

    best = candidates[0]
    rows = best.get('rows') or []
    headers = rows[0] if rows else []
    print(f"fetch_tgn: system_state result table id={best.get('id')!r} "
          f"{len(rows)} rows x {len(headers)} cols")
    print(f"  headers={headers}")

    data_rows = []
    for r in rows[1:]:
        record = {headers[i] if i < len(headers) else f'col_{i}': r[i]
                  for i in range(len(r))}
        data_rows.append(record)
    _save_system_state(data_rows, desde, hasta, headers)


def _save_system_state(rows, desde, hasta, headers):
    out_path = os.path.join(OUT_DIR, 'tgn_system_state.json')
    os.makedirs(OUT_DIR, exist_ok=True)
    write_json(
        out_path,
        rows,
        source='TGN ABII — Estado del Sistema',
        source_date=hasta,
        query={'desde': desde, 'hasta': hasta, 'gasoducto': 'TODOS'},
        headers=headers,
    )
    write_csv(json_to_csv_path(out_path), rows)
    print(f'fetch_tgn: wrote {len(rows)} rows to tgn_system_state.json')


def run():
    user, pw = env_credentials()
    if not user or not pw:
        print('fetch_tgn: TGN_USER/TGN_PASSWORD not set, skipping')
        return 0

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('fetch_tgn: playwright not installed', file=sys.stderr)
        return 1

    os.makedirs(RAW_DIR, exist_ok=True)
    storage = STATE_PATH if os.path.exists(STATE_PATH) else None

    with sync_playwright() as pw_api:
        browser = pw_api.chromium.launch(headless=True)
        context = browser.new_context(storage_state=storage)
        page = context.new_page()

        try:
            # Probe a protected path. If it redirects to the login form
            # the session is missing/expired and we authenticate inline;
            # the form action posts to the same URL and lands us back on
            # the protected page on success.
            page.goto(BASE_URL + PROBE_PATH, wait_until='domcontentloaded')
            if 'login.xhtml' in page.url:
                print(f'fetch_tgn: session missing, logging in (probe={page.url})')
                login(page, user, pw)
                if 'login.xhtml' in page.url:
                    print('fetch_tgn: login failed — still on login page '
                          f'(url={page.url})', file=sys.stderr)
                    return 1
                context.storage_state(path=STATE_PATH)
            else:
                print(f'fetch_tgn: existing session is valid (probe url={page.url})')

            print(f'fetch_tgn: logged in, landing url={page.url}')
            print(f'fetch_tgn: timestamp={datetime.now(timezone.utc).isoformat()}')

            # Phase 3a — Estado del Sistema report.
            scrape_system_state(page)

            # Phase 2 reconnaissance — keep behind a flag while Phase 3
            # scrapers are still being added. Set TGN_DISCOVER=1 to run
            # the discovery dump again.
            if os.environ.get('TGN_DISCOVER') != '1':
                return 0
            print('--- DISCOVERY: page title ---')
            print(page.title())
            print('--- DISCOVERY: anchors (href, text) ---')
            anchors = page.eval_on_selector_all(
                'a',
                """els => els.map(e => ({
                    href: e.getAttribute('href'),
                    text: (e.textContent || '').trim().slice(0, 100)
                })).filter(a => a.text || (a.href && a.href !== '#'))"""
            )
            for a in anchors[:120]:
                print(f"  href={a.get('href')!r}  text={a.get('text')!r}")
            print(f'--- DISCOVERY: {len(anchors)} anchors total ---')
            print('--- DISCOVERY: menu items (li, span with onclick/role) ---')
            menu_items = page.eval_on_selector_all(
                'li[role="menuitem"], li.ui-menuitem, span[onclick], div[onclick]',
                """els => els.map(e => ({
                    tag: e.tagName.toLowerCase(),
                    id: e.id,
                    text: (e.textContent || '').trim().slice(0, 100),
                    onclick: (e.getAttribute('onclick') || '').slice(0, 200)
                })).filter(x => x.text)"""
            )
            for m in menu_items[:80]:
                print(f"  {m.get('tag')} id={m.get('id')!r} text={m.get('text')!r}")
            print(f'--- DISCOVERY: {len(menu_items)} menu items ---')
            print('--- DISCOVERY: iframes ---')
            for fr in page.frames:
                print(f"  frame name={fr.name!r} url={fr.url!r}")
            # Inspect candidate data pages: dump tables, inputs and a
            # truncated HTML so we can pick selectors for Phase 3.
            for path in [
                'pages/reports/system_state/system-state-report.xhtml',
                'pages/programacion/nominaciones/nominacion.xhtml',
                'pages/programacion/confirmaciones/confirmacionGas.xhtml',
            ]:
                print(f'--- DISCOVERY: navigating {path} ---')
                try:
                    resp = page.goto(BASE_URL + path, wait_until='networkidle', timeout=30000)
                    print(f'  status={resp.status if resp else "?"} url={page.url}')
                    if 'login.xhtml' in page.url:
                        print('  redirected to login — skipping')
                        continue
                    print(f'  title={page.title()!r}')
                    tables = page.eval_on_selector_all(
                        'table',
                        """els => els.map(t => ({
                            id: t.id,
                            cls: t.className.slice(0,80),
                            rows: t.rows.length,
                            cols: t.rows[0] ? t.rows[0].cells.length : 0,
                            firstHeader: t.rows[0]
                                ? Array.from(t.rows[0].cells).map(c => (c.textContent||'').trim().slice(0,40))
                                : []
                        }))"""
                    )
                    print(f'  {len(tables)} table(s):')
                    for t in tables[:15]:
                        print(f"    id={t.get('id')!r} cls={t.get('cls')!r} {t.get('rows')}x{t.get('cols')}")
                        if t.get('firstHeader'):
                            print(f"      headers={t.get('firstHeader')}")
                    inputs = page.eval_on_selector_all(
                        'input:not([type="hidden"]):not([type="submit"]), select, label[for]',
                        """els => els.map(e => ({
                            tag: e.tagName.toLowerCase(),
                            type: e.type || '',
                            id: e.id,
                            name: e.getAttribute('name'),
                            label: (e.tagName === 'LABEL' ? e.textContent : e.getAttribute('aria-label') || e.placeholder || '').trim().slice(0,60)
                        }))"""
                    )
                    print(f'  {len(inputs)} input(s)/label(s):')
                    for i in inputs[:25]:
                        print(f"    {i.get('tag')} type={i.get('type')!r} id={i.get('id')!r} label={i.get('label')!r}")
                except Exception as e:
                    print(f'  error {type(e).__name__}: {str(e)[:200]}')
            print('--- DISCOVERY: end ---')
        finally:
            browser.close()

    return 0


if __name__ == '__main__':
    sys.exit(run())
