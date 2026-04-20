#!/usr/bin/env python3
"""Parse 'Base Reporte Estado de Sistema.xlsx' into JSON files for the dashboard."""

import json
import os
from datetime import datetime
import openpyxl

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# Column mapping for "Conv. valores" sheet (1-indexed)
COL = {
    'fecha': 2,
    'demanda_total': 3,
    'prioritaria': 4,
    'industria': 5,
    'usinas': 6,
    'exportaciones': 7,
    'iny_tgs': 8,
    'iny_tgn': 9,
    'iny_enarsa': 10,
    'iny_gpm': 11,
    'iny_bolivia': 12,
    'iny_escobar': 13,
    'iny_total': 14,
    'linepack_tgs': 15,
    'var_linepack_tgs': 16,
    'lim_inf_tgs': 17,
    'lim_sup_tgs': 18,
    'linepack_tgn': 19,
    'var_linepack_tgn': 20,
    'lim_inf_tgn': 21,
    'lim_sup_tgn': 22,
    'linepack_total': 23,
    'var_linepack_total': 24,
    'lim_inf_total': 25,
    'lim_sup_total': 26,
    'tramo_final_tgs': 27,
    'tf_lim_inf_tgs': 28,
    'tf_lim_sup_tgs': 29,
    'tramo_final_tgn': 30,
    'tf_lim_inf_tgn': 31,
    'tf_lim_sup_tgn': 32,
    'temp_min_ba': 33,
    'temp_max_ba': 34,
    'temp_prom_ba': 35,
    'temp_min_esquel': 36,
    'temp_max_esquel': 37,
    'temp_prom_esquel': 38,
    'cammesa_gas': 39,
    'cammesa_gasoil': 40,
    'cammesa_fueloil': 41,
    'cammesa_carbon': 42,
    'cammesa_total': 43,
}


def safe_float(v):
    if v is None:
        return None
    try:
        return round(float(v), 2)
    except (ValueError, TypeError):
        return None


def parse_conv_valores(wb):
    ws = wb['Conv. valores']
    rows = []
    for r in range(3, ws.max_row + 1):
        fecha = ws.cell(r, COL['fecha']).value
        if fecha is None:
            continue
        if isinstance(fecha, datetime):
            fecha_str = fecha.strftime('%Y-%m-%d')
        else:
            fecha_str = str(fecha)

        row = {'fecha': fecha_str}
        for key, col in COL.items():
            if key == 'fecha':
                continue
            row[key] = safe_float(ws.cell(r, col).value)

        # Treat 0.0 linepack as missing (not yet published)
        for lp_key in ['linepack_tgs', 'linepack_tgn', 'linepack_total']:
            if row.get(lp_key) == 0.0:
                row[lp_key] = None
        for var_key in ['var_linepack_tgs', 'var_linepack_tgn', 'var_linepack_total']:
            if row.get(var_key) == 0.0:
                row[var_key] = None

        # Treat 0.0 demand as missing (not yet published)
        if row.get('demanda_total') == 0.0:
            row['demanda_total'] = None
        if row.get('prioritaria') == 0.0:
            row['prioritaria'] = None

        # Skip rows where everything important is None (future dates)
        has_data = any(row.get(k) is not None for k in [
            'demanda_total', 'linepack_tgs', 'linepack_tgn', 'cammesa_gas'
        ])
        if not has_data:
            continue

        rows.append(row)

    # Remove duplicate dates (keep first occurrence which has more data)
    seen = set()
    deduped = []
    for row in rows:
        if row['fecha'] not in seen:
            seen.add(row['fecha'])
            deduped.append(row)

    return deduped


def parse_comments(wb):
    comments = {}

    # Diario sheet - daily comments
    if 'Diario' in wb.sheetnames:
        ws = wb['Diario']
        daily_comments = []
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                v = ws.cell(r, c).value
                if v and isinstance(v, str) and len(v) > 20:
                    daily_comments.append(v.strip())
        comments['daily'] = daily_comments

    # Proyección Semanal - weekly comments
    if 'Proyección Semanal' in wb.sheetnames:
        ws = wb['Proyección Semanal']
        weekly_comments = []
        for r in range(1, ws.max_row + 1):
            for c in range(1, ws.max_column + 1):
                v = ws.cell(r, c).value
                if v and isinstance(v, str) and len(v) > 20:
                    weekly_comments.append(v.strip())
        comments['weekly'] = weekly_comments

    return comments


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    xlsx_path = os.path.join(RAW_DIR, 'Base Reporte Estado de Sistema.xlsx')
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    # Parse daily data
    daily = parse_conv_valores(wb)
    with open(os.path.join(OUT_DIR, 'daily.json'), 'w', encoding='utf-8') as f:
        json.dump(daily, f, ensure_ascii=False, indent=2)
    print(f"daily.json: {len(daily)} rows ({daily[0]['fecha']} to {daily[-1]['fecha']})")

    # Parse comments
    comments = parse_comments(wb)
    with open(os.path.join(OUT_DIR, 'comments.json'), 'w', encoding='utf-8') as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)
    print(f"comments.json: {len(comments.get('daily', []))} daily, {len(comments.get('weekly', []))} weekly")

    wb.close()


if __name__ == '__main__':
    main()
