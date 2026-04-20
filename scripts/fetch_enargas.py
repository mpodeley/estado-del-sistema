#!/usr/bin/env python3
"""Fetch the latest ENARGAS TGS daily operational report PDF."""

import os
import re
import requests
from bs4 import BeautifulSoup

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
BASE_URL = 'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-proyeccion-semanal.php'


def fetch_latest_enargas():
    """Try to download the latest ENARGAS PDF. Returns path or None."""
    os.makedirs(RAW_DIR, exist_ok=True)
    try:
        r = requests.get(BASE_URL, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        # Look for PDF links - ENARGAS usually has direct download links
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'ETGS' in href and href.endswith('.pdf'):
                pdf_url = href if href.startswith('http') else f'https://www.enargas.gob.ar{href}'
                fname = pdf_url.split('/')[-1]
                out = os.path.join(RAW_DIR, fname)
                if os.path.exists(out):
                    print(f"Already have {fname}")
                    return out
                print(f"Downloading {pdf_url}")
                pdf_r = requests.get(pdf_url, timeout=60)
                pdf_r.raise_for_status()
                with open(out, 'wb') as f:
                    f.write(pdf_r.content)
                print(f"Saved {fname} ({len(pdf_r.content)} bytes)")
                return out
        # Fallback: look for any PDF link
        for link in soup.find_all('a', href=True):
            if link['href'].endswith('.pdf'):
                print(f"Found PDF link: {link['href']}")
        print("No ENARGAS PDF found on page")
        return None
    except Exception as e:
        print(f"Error fetching ENARGAS: {e}")
        return None


if __name__ == '__main__':
    result = fetch_latest_enargas()
    if result:
        print(f"OK: {result}")
    else:
        print("FAILED: Could not fetch ENARGAS PDF")
