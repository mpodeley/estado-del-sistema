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
NOMINACIONES_PATH = 'pages/programacion/nominaciones/nominacion.xhtml'


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
    except Exception as e:
        print(f'fetch_tgn: click Ver reporte failed: {e}', file=sys.stderr)
        return

    # Wait for the result panel to actually populate. JSF replaces the
    # panelGrilla's inner content via XHR — we look for a real data
    # table inside it (not just any descendant), with a generous
    # timeout because the report can take a while.
    try:
        page.wait_for_function(
            """() => {
                const p = document.getElementById('formulario:panelGrilla');
                if (!p) return false;
                const tbl = p.querySelector('table');
                return tbl && tbl.rows.length >= 2;
            }""",
            timeout=60000,
        )
    except Exception as e:
        print(f'fetch_tgn: panelGrilla never populated: {e}', file=sys.stderr)
        # Dump the panelGrilla HTML to learn why.
        try:
            panel_html = page.eval_on_selector(
                'div[id="formulario:panelGrilla"]',
                'el => el.outerHTML.slice(0, 2000)',
            )
            print(f'  panelGrilla HTML head: {panel_html}')
        except Exception:
            pass
        _save_system_state([], desde, hasta, [])
        return

    # Read the result table directly from panelGrilla so we never grab
    # the hidden 'comunicación perdida' message panel by accident.
    result = page.eval_on_selector(
        'div[id="formulario:panelGrilla"] table',
        """t => ({
            id: t.id,
            cls: t.className.slice(0,80),
            rows: Array.from(t.rows).map(r =>
                Array.from(r.cells).map(c => (c.textContent || '').trim())
            )
        })"""
    )
    rows = result.get('rows') or []
    headers = rows[0] if rows else []
    print(f"fetch_tgn: system_state result table id={result.get('id')!r} "
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
    # Strip the literal '<br>' that pdfplumber-style textContent leaves
    # in header keys ('Día <br>Operativo').
    rows = [{k.replace('<br>', ' ').strip(): v for k, v in r.items()} for r in rows]
    headers = [h.replace('<br>', ' ').strip() for h in headers]
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


def scrape_nominaciones(page):
    """Nominaciones page expects a 'Día Operativo' date and required
    'Gasoducto' + 'Cargador' selects. This first pass logs the form's
    structure (select options for Gasoducto, button IDs) so we can pin
    down the right defaults — then submits with the first available
    options and reads the result.
    """
    try:
        page.goto(BASE_URL + NOMINACIONES_PATH, wait_until='networkidle', timeout=30000)
    except Exception as e:
        print(f'fetch_tgn: failed to open nominaciones: {e}', file=sys.stderr)
        return

    # Dump the form's inputs + buttons so we can map IDs without manual
    # exploration. Phase 3b is still in reconnaissance — remove this
    # block once the scraper consistently extracts data.
    try:
        page.wait_for_selector('div[id="formulario:panelFiltro"]',
                                state='visible', timeout=15000)
        page.wait_for_timeout(1000)
    except Exception as e:
        print(f'fetch_tgn: nominaciones filter panel never showed: {e}',
              file=sys.stderr)
        return

    print('--- NOMINACIONES discovery ---')
    inputs = page.eval_on_selector_all(
        'input:not([type="hidden"]):not([type="submit"]), select',
        """els => els.map(e => ({
            tag: e.tagName.toLowerCase(),
            type: e.type || '',
            id: e.id,
            name: e.getAttribute('name'),
            value: e.value || '',
            placeholder: e.placeholder || ''
        }))"""
    )
    print(f'  {len(inputs)} input/select element(s):')
    for i in inputs[:25]:
        val = (i.get('value') or '')[:40]
        ph = (i.get('placeholder') or '')[:30]
        print(f"    {i.get('tag')} type={i.get('type')!r} id={i.get('id')!r} "
              f"value={val!r} placeholder={ph!r}")

    buttons = page.eval_on_selector_all(
        'button',
        """els => els.map(e => ({
            id: e.id,
            type: e.getAttribute('type'),
            text: (e.textContent || '').trim().slice(0,40)
        })).filter(b => b.text || b.id.includes('formulario:'))"""
    )
    print(f'  {len(buttons)} button(s) in form:')
    for b in buttons[:20]:
        print(f"    id={b.get('id')!r} text={b.get('text')!r}")

    # Gasoducto select options (visible in the autocomplete dropdown).
    try:
        gasoducto_options = page.eval_on_selector_all(
            'select[id="formulario:gasoducto_input"] option',
            'els => els.map(e => ({value: e.value, text: e.textContent.trim()}))'
        )
        print(f'  Gasoducto options ({len(gasoducto_options)}):')
        for o in gasoducto_options[:15]:
            print(f"    value={o.get('value')!r} text={o.get('text')!r}")
    except Exception as e:
        print(f'  could not read gasoducto options: {e}')

    print('--- NOMINACIONES discovery end ---')


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
            # Phase 3b — Nominaciones (still in discovery; logs the
            # form's structure when no rows are extracted).
            scrape_nominaciones(page)

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
