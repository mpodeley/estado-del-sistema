#!/usr/bin/env python3
"""Parse CAMMESA weekly dispatch outlook PDF.

Extracts the two-week 'Balance Semanal' table from page 7 of
PrevisionDespachoEnergetico_*.pdf — GWh + MWmed by source (demanda,
exportación, térmico, hidráulico, nuclear, renovable, importación)
plus fuel forecasts (gas, FO, GO, carbón).

The PDF uses rotated labels and a layout pdfplumber decodes with
mangled accents ('T�rmico'), so this parser identifies rows by
position within the extracted table rather than by label match.
"""

import glob
import os
import re
import sys
from datetime import datetime

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _meta import write_json, write_csv, json_to_csv_path  # noqa: E402

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# Order of the energy-source rows on page 7. Each row reports GWh + MWmed.
ENERGY_FIELDS = [
    'demanda', 'exportacion', 'termico', 'hidraulico',
    'nuclear', 'renovable', 'importacion',
]
# Then four fuel rows. Each reports a single weekly figure.
FUEL_FIELDS = ['gas_mm3_dia', 'fo_miles_ton', 'go_miles_m3', 'carbon_miles_ton']


def parse_number(s):
    """CAMMESA prints integers without thousand separators (e.g. '2967')
    and decimals with either '.' or ',' (e.g. '35.0', '700,08'). Treat
    both as decimal separators."""
    if s is None:
        return None
    cleaned = str(s).strip().replace(',', '.')
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_report_date(page1_text):
    """Extract the report date from page 1's footer 'DD/MM/YY' stamp."""
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', page1_text or '')
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        y += 2000
    try:
        return f"{y:04d}-{mo:02d}-{d:02d}"
    except ValueError:
        return None


def parse_date_range(s):
    """'11/5/2026 - 17/5/2026' -> ('2026-05-11', '2026-05-17')."""
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4})', s or '')
    if not m:
        return None, None
    sd = f"{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    ed = f"{int(m.group(6)):04d}-{int(m.group(5)):02d}-{int(m.group(4)):02d}"
    return sd, ed


def find_first(rows, predicate):
    for i, row in enumerate(rows):
        if predicate(row):
            return i
    return -1


def row_cells(row):
    return [c if c is not None else '' for c in row]


def week_from_tables(tables):
    """Map page-7 tables into [week_current, week_next]. Each table is a
    list of rows; first table holds the current week (5 columns: label,
    units, GWh, MWmed) and the second holds the next week (just GWh +
    MWmed, no labels).

    Returns a list of dicts with the extracted fields, or [] if the
    page layout doesn't match.
    """
    if len(tables) < 2:
        return []

    t1, t2 = tables[0], tables[1]

    # On t1 we anchor by finding the row with "Semana NN" so we don't
    # depend on the rotated header column.
    week1_num, week2_num = None, None
    week1_range, week2_range = '', ''

    for row in t1:
        cells = row_cells(row)
        joined = ' '.join(cells)
        if 'Semana' in joined or 'semana' in joined:
            # Last cell holds the number.
            for c in reversed(cells):
                if c and re.fullmatch(r'\d{1,2}', str(c).strip()):
                    week1_num = str(c).strip()
                    break
        if '/' in joined and '-' in joined and not week1_range:
            week1_range = joined

    for row in t2:
        cells = row_cells(row)
        joined = ' '.join(cells)
        if 'Semana' in joined or 'semana' in joined:
            for c in cells:
                if c and re.fullmatch(r'\d{1,2}', str(c).strip()):
                    week2_num = str(c).strip()
                    break
        if '/' in joined and '-' in joined and not week2_range:
            week2_range = joined

    sd1, ed1 = parse_date_range(week1_range)
    sd2, ed2 = parse_date_range(week2_range)

    # Numeric rows: pull every row from t1 whose last 2 cells parse as
    # numbers (energy block) plus every row whose 4th cell parses but
    # 5th does not (fuel block). Same for t2 but on cells 0/1.
    def numeric_rows_t1(table):
        energy, fuel = [], []
        for row in table:
            cells = row_cells(row)
            if len(cells) < 5:
                continue
            gwh = parse_number(cells[-2])
            mw = parse_number(cells[-1])
            if gwh is not None and mw is not None:
                energy.append((gwh, mw))
                continue
            val = parse_number(cells[-2])
            if val is not None and not mw:
                fuel.append(val)
        return energy, fuel

    def numeric_rows_t2(table):
        energy, fuel = [], []
        for row in table:
            cells = row_cells(row)
            if len(cells) < 2:
                continue
            gwh = parse_number(cells[0])
            mw = parse_number(cells[1]) if len(cells) > 1 else None
            if gwh is not None and mw is not None:
                energy.append((gwh, mw))
                continue
            if gwh is not None and mw is None:
                fuel.append(gwh)
        return energy, fuel

    e1, f1 = numeric_rows_t1(t1)
    e2, f2 = numeric_rows_t2(t2)

    def build_week(num, sd, ed, energy, fuel):
        out = {'week_num': num, 'start_date': sd, 'end_date': ed}
        for i, name in enumerate(ENERGY_FIELDS):
            gwh, mw = energy[i] if i < len(energy) else (None, None)
            out[f'{name}_gwh'] = gwh
            out[f'{name}_mwmed'] = mw
        for i, name in enumerate(FUEL_FIELDS):
            out[name] = fuel[i] if i < len(fuel) else None
        return out

    weeks = []
    if e1:
        weeks.append(build_week(week1_num, sd1, ed1, e1, f1))
    if e2:
        weeks.append(build_week(week2_num, sd2, ed2, e2, f2))
    return weeks


def parse_cammesa_pdf(path):
    with pdfplumber.open(path) as pdf:
        page1_text = pdf.pages[0].extract_text() or ''
        # Page 7 in CAMMESA's layout — guard for shorter PDFs by trying
        # the surrounding pages too.
        candidate_pages = [6, 5, 7]
        tables = []
        for idx in candidate_pages:
            if idx >= len(pdf.pages):
                continue
            t = pdf.pages[idx].extract_tables() or []
            text = pdf.pages[idx].extract_text() or ''
            if 'Semana' in text and 'Gwh' in text:
                tables = t
                break

    weeks = week_from_tables(tables)
    return {
        'report_date': parse_report_date(page1_text),
        'report_filename': os.path.basename(path),
        'weeks': weeks,
    }


def latest_pdf():
    """Pick the most recently dated PrevisionDespachoEnergetico_*.pdf
    in raw/. Sort by filename — the YYYYMMDD timestamp embedded by
    fetch_cammesa.py makes lexical order match chronological."""
    pdfs = sorted(glob.glob(os.path.join(RAW_DIR, 'PrevisionDespachoEnergetico_*.pdf')))
    return pdfs[-1] if pdfs else None


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pdf = latest_pdf()
    if not pdf:
        print("No PrevisionDespachoEnergetico_*.pdf found in raw/")
        return

    try:
        with open(pdf, 'rb') as fh:
            if fh.read(5) != b'%PDF-':
                print(f"{os.path.basename(pdf)}: not a valid PDF", file=sys.stderr)
                return
        payload = parse_cammesa_pdf(pdf)
    except Exception as e:
        print(f"Error parsing {pdf}: {e}", file=sys.stderr)
        return

    if not payload['weeks']:
        print(f"WARN: no weekly rows extracted from {os.path.basename(pdf)}", file=sys.stderr)

    out_path = os.path.join(OUT_DIR, 'cammesa_weekly.json')
    write_json(out_path, payload, source='CAMMESA — Previsión Despacho Energético')

    # CSV: one row per week with every field flattened, for the audit
    # download on the Fuentes page.
    flat = []
    for w in payload['weeks']:
        row = {'report_date': payload['report_date']}
        row.update(w)
        flat.append(row)
    write_csv(json_to_csv_path(out_path), flat)
    print(f"cammesa_weekly.json: {len(payload['weeks'])} weeks (report {payload['report_date']})")


if __name__ == '__main__':
    main()
