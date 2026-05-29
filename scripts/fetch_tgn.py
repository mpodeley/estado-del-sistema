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
            print('--- DISCOVERY: raw HTML head ---')
            html = page.content()
            print(html[:4000])
            print(f'--- DISCOVERY: total HTML length={len(html)} ---')
            # Probe common post-login paths to see which ones respond
            # without redirecting back to login.
            print('--- DISCOVERY: probing common paths ---')
            for path in [
                'pages/home.xhtml', 'pages/main.xhtml', 'pages/menu.xhtml',
                'pages/index.xhtml', 'pages/inicio.xhtml',
                'pages/principal.xhtml', 'home.xhtml', 'main.xhtml',
            ]:
                try:
                    resp = page.goto(BASE_URL + path, wait_until='domcontentloaded', timeout=10000)
                    final = page.url
                    status = resp.status if resp else 'no-response'
                    redirected = 'login.xhtml' in final
                    print(f"  {path}: status={status} final={final} redirected_to_login={redirected}")
                except Exception as e:
                    print(f"  {path}: error {type(e).__name__}: {str(e)[:120]}")
            print('--- DISCOVERY: end ---')
        finally:
            browser.close()

    return 0


if __name__ == '__main__':
    sys.exit(run())
