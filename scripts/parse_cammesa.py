#!/usr/bin/env python3
"""Parse CAMMESA weekly projection PDF into structured data."""

import os
import re
import sys
import glob
import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _meta import write_json, write_csv, json_to_csv_path  # noqa: E402

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

REQUIRED_FIELDS = {'demanda_total', 'temperatura', 'prioritaria'}

MONTHS = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
           'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}


def parse_number(s):
    if not s:
        return None
    s = s.strip().replace(',', '.')
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def parse_cammesa_pdf(path):
    """Extract weekly projection data from CAMMESA PDF."""
    with pdfplumber.open(path) as pdf:
        text = pdf.pages[0].extract_text()

    lines = text.split('\n')
    data = {'source': os.path.basename(path), 'days': []}

    # Parse the column header dates
    # Pattern: "jue 09 - abr REAL vie 10 - abr sáb 11 - abr dom 12 - abr lun 13 - abr"
    header_line = None
    for line in lines:
        if 'REAL' in line and ('lun' in line or 'mar' in line or 'mié' in line or 'jue' in line or 'vie' in line):
            header_line = line
            break

    day_dates = []
    if header_line:
        # Extract day-month pairs
        day_pattern = r'(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\s+(\d{1,2})\s*-\s*(\w+)'
        for m in re.finditer(day_pattern, header_line):
            day = int(m.group(1))
            mon_str = m.group(2).lower()[:3]
            mon = MONTHS.get(mon_str, 0)
            day_dates.append((day, mon))

    # Parse key rows - each row has label followed by numbers
    def extract_row(label_pattern):
        for line in lines:
            m = re.match(label_pattern + r'\s+([\d,.]+(?:\s+[\d,.]+)*)', line)
            if m:
                nums = re.findall(r'[\d,.]+', m.group(1) if hasattr(m, 'group') else line[m.end():])
                return [parse_number(n) for n in nums]
            # Try simpler: find the label then grab numbers after it
            if re.search(label_pattern, line):
                nums = re.findall(r'[\d,.]+', line)
                # Skip the first number if it's part of the label
                return [parse_number(n) for n in nums[-len(day_dates):]] if day_dates else [parse_number(n) for n in nums]
        return []

    # Extract temperature row
    for line in lines:
        if 'Temperatura Media' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['temperatura'] = [parse_number(n) for n in nums]
            break

    # Extract demand total
    for line in lines:
        if 'DEMANDA TOTAL' in line and 'MMm' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['demanda_total'] = [parse_number(n) for n in nums]
            break

    # Extract prioritaria
    for line in lines:
        if 'Demanda Prioritaria' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['prioritaria'] = [parse_number(n) for n in nums]
            break

    # Extract industria
    for line in lines:
        if 'Industria' in line and 'P3' in line:
            nums = re.findall(r'[\d,.]+', line)
            # Filter out the "3" from P3
            data['industria'] = [parse_number(n) for n in nums if n != '3']
            break

    # Extract usinas
    for line in lines:
        if 'Usinas dentro' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['usinas'] = [parse_number(n) for n in nums]
            break

    # Extract total injections
    for line in lines:
        if 'INYECCIONES' in line and 'TGN' in line and 'TGS' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['inyecciones'] = [parse_number(n) for n in nums]
            break

    # Extract STOCK
    for line in lines:
        if 'STOCK' in line and 'Min' in line:
            nums = re.findall(r'[\d,.]+', line)
            data['stock'] = [parse_number(n) for n in nums]
            # Extract min/max
            m = re.search(r'Min:\s*([\d,.]+).*Max:\s*([\d,.]+)', line)
            if m:
                data['stock_min'] = parse_number(m.group(1))
                data['stock_max'] = parse_number(m.group(2))
            break

    # Derive year from filename (PS_YYYYMMDD.pdf).
    year = None
    m = re.search(r'PS_(\d{4})\d{4}', os.path.basename(path))
    if m:
        year = int(m.group(1))

    # Build day-by-day structure, emit ISO fecha when year is inferable.
    for i, (day, mon) in enumerate(day_dates):
        entry = {'dia': day, 'mes': mon}
        if year:
            # Handle year rollover for December -> January forecasts.
            y = year
            entry['fecha'] = f"{y:04d}-{mon:02d}-{day:02d}"
        for key in ['temperatura', 'demanda_total', 'prioritaria', 'industria', 'usinas', 'inyecciones', 'stock']:
            vals = data.get(key, [])
            entry[key] = vals[i] if i < len(vals) else None
        data['days'].append(entry)

    return data


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pdfs = sorted(glob.glob(os.path.join(RAW_DIR, 'PS_*.pdf')))
    if not pdfs:
        print("No CAMMESA PDFs found")
        return

    results = []
    issues = []
    for p in pdfs:
        try:
            with open(p, 'rb') as fh:
                if fh.read(5) != b'%PDF-':
                    issues.append(f"{os.path.basename(p)}: not a valid PDF (skipped)")
                    continue
            d = parse_cammesa_pdf(p)
            missing = REQUIRED_FIELDS - d.keys()
            if missing:
                issues.append(f"{os.path.basename(p)}: missing {sorted(missing)}")
            print(f"Parsed {os.path.basename(p)}: {len(d['days'])} days")
            for day in d['days']:
                print(f"  Dia {day['dia']}/{day['mes']}: T={day.get('temperatura')}, Dem={day.get('demanda_total')}")
            results.append(d)
        except Exception as e:
            issues.append(f"{os.path.basename(p)}: exception {e}")
            print(f"Error parsing {p}: {e}", file=sys.stderr)

    if issues:
        print("WARN: CAMMESA parse issues:", file=sys.stderr)
        for msg in issues:
            print(f"  {msg}", file=sys.stderr)

    weekly_path = os.path.join(OUT_DIR, 'cammesa_weekly.json')
    write_json(
        weekly_path,
        results,
        source='CAMMESA weekly PS_* PDFs',
        issues=issues,
    )
    # Flatten to one row per (source, day) so the CSV is auditable day-by-day.
    weekly_flat = []
    for rep in results:
        source = rep.get('source')
        for day in rep.get('days', []):
            weekly_flat.append({
                'source': source,
                'fecha': day.get('fecha'),
                'dia': day.get('dia'),
                'mes': day.get('mes'),
                'temperatura': day.get('temperatura'),
                'demanda_total': day.get('demanda_total'),
                'prioritaria': day.get('prioritaria'),
                'industria': day.get('industria'),
                'usinas': day.get('usinas'),
                'inyecciones': day.get('inyecciones'),
                'stock': day.get('stock'),
            })
    write_csv(json_to_csv_path(weekly_path), weekly_flat)
    print(f"cammesa_weekly.json: {len(results)} reports")


if __name__ == '__main__':
    main()
