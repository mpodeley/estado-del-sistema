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
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW_DIR = os.path.join(ROOT, 'raw')
STATE_PATH = os.path.join(RAW_DIR, 'tgn_state.json')

BASE_URL = os.environ.get('TGN_BASE_URL', 'https://abii.tgn.com.ar/')
LOGIN_PATH = 'pages/login.xhtml'
# A path that requires auth — used both as a probe (to detect whether
# the session is still valid) and as the landing page after login.
PROBE_PATH = 'pages/home.xhtml'


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
            # Phase 2 reconnaissance — dump the page's nav structure to
            # stdout so we can map sections without manual exploration.
            # Remove once the section scrapers are in place.
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
