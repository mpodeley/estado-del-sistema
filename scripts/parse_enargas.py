#!/usr/bin/env python3
"""Parse ENARGAS TGS daily operational report PDF into structured data."""

import os
import re
import json
import glob
import pdfplumber

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')


def parse_number(s):
    """Parse a number string, handling comma as decimal separator."""
    if not s:
        return None
    s = s.strip().replace(',', '.')
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def parse_enargas_pdf(path):
    """Extract key data from ENARGAS TGS daily report."""
    with pdfplumber.open(path) as pdf:
        text = pdf.pages[0].extract_text()

    data = {'source': os.path.basename(path)}

    # Date
    m = re.search(r'Datos del d[ií]a operativo\s*(\d{2}/\d{2}/\d{4})', text)
    if m:
        d, mo, y = m.group(1).split('/')
        data['fecha'] = f"{y}-{mo}-{d}"

    # Recepciones globales
    m = re.search(r'Cuenca Sur\s+([\d,.]+)\s+([\d,.]+)', text)
    if m:
        data['tgs_cuenca_sur_prog'] = parse_number(m.group(1))
        data['tgs_cuenca_sur_real'] = parse_number(m.group(2))

    m = re.search(r'Cuenca Neuquina\s+([\d,.]+)\s+([\d,.]+)', text)
    if m:
        data['tgs_cuenca_nqn_prog'] = parse_number(m.group(1))
        data['tgs_cuenca_nqn_real'] = parse_number(m.group(2))

    # Estado del sistema
    m = re.search(r'Estado\s+(Normal|Alerta|Cr[ií]tico)', text)
    if m:
        data['estado_tgs'] = m.group(1)

    m = re.search(r'Motivo\s+(.+?)(?:\n|$)', text)
    if m:
        data['motivo_tgs'] = m.group(1).strip()

    # Linepack
    m = re.search(r'D[ií]a Anterior\s+([\d,.]+)\s+D[ií]a Actual\s+([\d,.]+)\s+Variaci[oó]n\s+([-\d,.]+)', text)
    if m:
        data['linepack_tgs_anterior'] = parse_number(m.group(1))
        data['linepack_tgs_actual'] = parse_number(m.group(2))
        data['linepack_tgs_var'] = parse_number(m.group(3))

    return data


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Find all ENARGAS PDFs
    pdfs = sorted(glob.glob(os.path.join(RAW_DIR, 'ETGS*.pdf')))
    if not pdfs:
        print("No ENARGAS PDFs found")
        return

    results = []
    for p in pdfs:
        try:
            d = parse_enargas_pdf(p)
            results.append(d)
            print(f"Parsed {os.path.basename(p)}: fecha={d.get('fecha')}, LP={d.get('linepack_tgs_actual')}, estado={d.get('estado_tgs')}")
        except Exception as e:
            print(f"Error parsing {p}: {e}")

    with open(os.path.join(OUT_DIR, 'enargas.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"enargas.json: {len(results)} reports")


if __name__ == '__main__':
    main()
