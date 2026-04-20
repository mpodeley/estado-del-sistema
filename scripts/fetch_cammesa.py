#!/usr/bin/env python3
"""Fetch CAMMESA weekly/daily programming PDFs."""

import os
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
WEEKLY_URL = 'https://cammesaweb.cammesa.com/programacion-semanal/'


def looks_like_pdf(content: bytes) -> bool:
    return content[:5] == b'%PDF-'


def fetch_cammesa_weekly():
    """Try to download latest CAMMESA weekly programming PDF."""
    os.makedirs(RAW_DIR, exist_ok=True)
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        r = requests.get(WEEKLY_URL, headers=headers, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        # Look for PDF links with PS_ pattern
        for link in soup.find_all('a', href=True):
            href = link['href']
            if 'PS_' in href and href.endswith('.pdf'):
                pdf_url = href if href.startswith('http') else f'https://cammesaweb.cammesa.com{href}'
                fname = pdf_url.split('/')[-1]
                out = os.path.join(RAW_DIR, fname)
                if os.path.exists(out):
                    print(f"Already have {fname}")
                    return out
                print(f"Downloading {pdf_url}")
                pdf_r = requests.get(pdf_url, headers=headers, timeout=60)
                pdf_r.raise_for_status()
                if not looks_like_pdf(pdf_r.content):
                    print(f"Skip {fname}: response is not a PDF (first bytes {pdf_r.content[:10]!r})")
                    continue
                with open(out, 'wb') as f:
                    f.write(pdf_r.content)
                print(f"Saved {fname} ({len(pdf_r.content)} bytes)")
                return out

        # Try direct URL pattern: PS_YYYYMMDD.pdf
        today = datetime.now()
        for offset in range(7):
            from datetime import timedelta
            d = today - timedelta(days=offset)
            fname = f"PS_{d.strftime('%Y%m%d')}.pdf"
            # Try common CAMMESA download paths
            for base in [
                'https://cammesaweb.cammesa.com/download/',
                'https://portalweb.cammesa.com/download/',
            ]:
                try:
                    url = base + fname
                    pdf_r = requests.get(url, headers=headers, timeout=15)
                    if pdf_r.status_code == 200 and len(pdf_r.content) > 1000 and looks_like_pdf(pdf_r.content):
                        out = os.path.join(RAW_DIR, fname)
                        with open(out, 'wb') as f:
                            f.write(pdf_r.content)
                        print(f"Saved {fname} ({len(pdf_r.content)} bytes)")
                        return out
                except Exception:
                    continue

        print("No CAMMESA weekly PDF found")
        return None
    except Exception as e:
        print(f"Error fetching CAMMESA: {e}")
        return None


if __name__ == '__main__':
    result = fetch_cammesa_weekly()
    if result:
        print(f"OK: {result}")
    else:
        print("FAILED: Could not fetch CAMMESA PDF")
