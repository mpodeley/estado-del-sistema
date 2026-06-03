#!/usr/bin/env python3
"""Build daily.json from the automatic sources (the merge, in Python).

This replaces the manual Excel (parse_base_excel.py) as the producer of
daily.json. The Excel-era manual rows are frozen once in daily_history.json
(linepack TGN/TGS limits, Esquel temps, etc. for the handful of days the analyst
maintained by hand); this script loads that snapshot and upserts every automatic
feed on top, creating a row per date and filling only the holes — a value already
present always wins. It is the exact precedence the frontend used to apply at
render time in src/utils/mergeDaily.ts, moved into the pipeline so daily.json is
self-sufficient and the Excel can be retired.

Fill priority (first source to fill a hole wins):
  - PS  (enargas_ps.json): the authority for linepack TGN/TGS/total + Min/Max
        límites, system delta, tramos finales, ENARSA/GPFM, Buque Escobar,
        Bolivia, plus demand-by-segment and injection totals. This is what makes
        the TGN linepack current again (the Excel had no automatic refill).
  - RDS (enargas.json): demand by segment, temperature, linepack total.
  - ING (enargas_ing.json, tipo R): per-system injection (TGS/TGN/total).
  - ETGS (etgs.json): TGS linepack stock + variation.
  - PPO (cammesa_ppo.json): CAMMESA fuel-gas consumption.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _meta import write_json, write_csv, json_to_csv_path  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
DAILY_JSON = os.path.join(OUT_DIR, 'daily.json')
HISTORY_JSON = os.path.join(OUT_DIR, 'daily_history.json')


def _load(name):
    path = os.path.join(OUT_DIR, name)
    if not os.path.exists(path):
        return [], None
    with open(path, encoding='utf-8') as f:
        raw = json.load(f)
    if isinstance(raw, dict):
        return raw.get('data') or [], raw
    return raw or [], None


def fill(cur, cand):
    """Source fills only when daily has no value yet."""
    return cur if cur is not None else cand


def fillz(cur, cand):
    """Like fill, but treat 0 as missing — several Excel columns carry 0.0 for a
    half-completed row (the parser's zero-as-null flag is off for them)."""
    return cur if (cur is not None and cur != 0) else cand


def _get(d, *path):
    for k in path:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    return d


def main():
    history, hist_env = _load('daily_history.json')
    if not history:
        print('ERROR: daily_history.json missing or empty — cannot build daily.json',
              file=sys.stderr)
        return 1
    fields = list(history[0].keys())

    def blank(fecha):
        row = {k: None for k in fields}
        row['fecha'] = fecha
        return row

    by_date = {}
    for d in history:
        if d.get('fecha'):
            by_date[d['fecha']] = dict(d)

    def row_for(fecha):
        r = by_date.get(fecha)
        if r is None:
            r = blank(fecha)
            by_date[fecha] = r
        return r

    rds, _ = _load('enargas.json')
    ing, _ = _load('enargas_ing.json')
    etgs, _ = _load('etgs.json')
    ppo, _ = _load('cammesa_ppo.json')
    ps, _ = _load('enargas_ps.json')

    # PS — authority for linepack TGN/TGS/total + límites + tramos finales +
    # ENARSA/GPFM/Escobar/Bolivia, also demand & injection.
    for r in ps:
        f = r.get('fecha')
        if not f:
            continue
        row = row_for(f)
        row['demanda_total'] = fill(row['demanda_total'], r.get('demanda_total'))
        row['prioritaria'] = fill(row['prioritaria'], r.get('prioritaria'))
        row['usinas'] = fillz(row['usinas'], r.get('usinas'))
        row['industria'] = fillz(row['industria'], r.get('industria'))
        exp = None
        if r.get('exp_tgn') is not None or r.get('exp_tgs') is not None:
            exp = (r.get('exp_tgn') or 0) + (r.get('exp_tgs') or 0)
        row['exportaciones'] = fillz(row['exportaciones'], exp)
        row['iny_tgs'] = fillz(row['iny_tgs'], r.get('iny_tgs'))
        row['iny_tgn'] = fillz(row['iny_tgn'], r.get('iny_tgn'))
        row['iny_total'] = fillz(row['iny_total'], r.get('iny_total'))
        row['iny_enarsa'] = fill(row['iny_enarsa'], r.get('iny_enarsa'))
        row['iny_gpm'] = fill(row['iny_gpm'], r.get('iny_gpm'))
        row['iny_bolivia'] = fill(row['iny_bolivia'], r.get('iny_bolivia'))
        row['iny_escobar'] = fill(row['iny_escobar'], r.get('iny_escobar'))
        row['temp_prom_ba'] = fill(row['temp_prom_ba'], r.get('temp_prom_ba'))
        row['linepack_total'] = fill(row['linepack_total'], r.get('linepack_total'))
        row['var_linepack_total'] = fill(row['var_linepack_total'], r.get('var_linepack_total'))
        row['lim_inf_total'] = fill(row['lim_inf_total'], r.get('lim_inf_total'))
        row['lim_sup_total'] = fill(row['lim_sup_total'], r.get('lim_sup_total'))
        row['linepack_tgs'] = fill(row['linepack_tgs'], r.get('linepack_tgs'))
        row['lim_inf_tgs'] = fill(row['lim_inf_tgs'], r.get('lim_inf_tgs'))
        row['lim_sup_tgs'] = fill(row['lim_sup_tgs'], r.get('lim_sup_tgs'))
        row['linepack_tgn'] = fill(row['linepack_tgn'], r.get('linepack_tgn'))
        row['lim_inf_tgn'] = fill(row['lim_inf_tgn'], r.get('lim_inf_tgn'))
        row['lim_sup_tgn'] = fill(row['lim_sup_tgn'], r.get('lim_sup_tgn'))
        row['tramo_final_tgs'] = fill(row['tramo_final_tgs'], r.get('tramo_final_tgs'))
        row['tramo_final_tgn'] = fill(row['tramo_final_tgn'], r.get('tramo_final_tgn'))

    # RDS — demand by sector + linepack_total + temperature.
    for r in rds:
        f = r.get('fecha')
        if not f:
            continue
        row = row_for(f)
        exps = r.get('exportaciones') or {}
        exp_total = None
        tgn, tgs = _get(exps, 'tgn', 'vol_exportar'), _get(exps, 'tgs', 'vol_exportar')
        if tgn is not None or tgs is not None:
            exp_total = (tgn or 0) + (tgs or 0)
        row['demanda_total'] = fill(row['demanda_total'], r.get('consumo_total_estimado'))
        row['prioritaria'] = fill(row['prioritaria'], _get(r, 'consumos', 'prioritaria', 'programa'))
        row['usinas'] = fillz(row['usinas'], _get(r, 'consumos', 'cammesa', 'programa'))
        row['industria'] = fillz(row['industria'], _get(r, 'consumos', 'industria', 'programa'))
        row['exportaciones'] = fillz(row['exportaciones'], exp_total)
        row['temp_prom_ba'] = fill(row['temp_prom_ba'], _get(r, 'temperatura_ba', 'tm'))
        row['temp_min_ba'] = fill(row['temp_min_ba'], _get(r, 'temperatura_ba', 'min'))
        row['temp_max_ba'] = fill(row['temp_max_ba'], _get(r, 'temperatura_ba', 'max'))
        row['linepack_total'] = fill(row['linepack_total'], r.get('linepack_total'))

    # ING — per-gasoducto injection; only "R" (real) rows for historical fill.
    for r in ing:
        f = r.get('fecha')
        if not f or r.get('tipo') != 'R':
            continue
        row = row_for(f)
        row['iny_tgs'] = fillz(row['iny_tgs'], r.get('tgs'))
        row['iny_tgn'] = fillz(row['iny_tgn'], r.get('tgn'))
        row['iny_total'] = fillz(row['iny_total'], r.get('total'))

    # ETGS — real TGS linepack stock (the only daily source that carries it).
    for r in etgs:
        f = r.get('fecha')
        if not f:
            continue
        row = row_for(f)
        row['linepack_tgs'] = fill(row['linepack_tgs'], r.get('linepack_tgs_dia_actual'))
        row['var_linepack_tgs'] = fill(row['var_linepack_tgs'], r.get('linepack_tgs_variacion'))

    # CAMMESA PPO — real fuel mix; cammesa_total tracks gas (other fuels small).
    for r in ppo:
        f = r.get('fecha')
        if not f:
            continue
        row = row_for(f)
        row['cammesa_gas'] = fillz(row['cammesa_gas'], r.get('gas_mmm3'))
        row['cammesa_total'] = fillz(row['cammesa_total'], r.get('gas_mmm3'))

    # TGN ABII — 'Actual' (m³) is the TGN linepack. PS isn't published on
    # weekends/holidays, so use the daily ABII scrape to fill those gaps in
    # linepack_tgn (the same fallback the LinepackChart applied client-side).
    tgn_state, _ = _load('tgn_system_state.json')
    for r in tgn_state:
        f = r.get('fecha')
        if not f:
            continue
        actual = r.get('Actual')
        try:
            mmm3 = round(float(actual) / 1_000_000, 2) if actual not in (None, '') else None
        except (TypeError, ValueError):
            mmm3 = None
        if mmm3 is None:
            continue
        row = row_for(f)
        row['linepack_tgn'] = fill(row['linepack_tgn'], mmm3)

    rows = sorted(by_date.values(), key=lambda r: r.get('fecha') or '')
    latest = rows[-1]['fecha'] if rows else None
    write_json(
        DAILY_JSON, rows,
        source='Construido de RDS + PS + ING + ETGS + PPO (histórico manual congelado en daily_history.json)',
        source_date=latest,
    )
    write_csv(json_to_csv_path(DAILY_JSON),
              ({k: r.get(k) for k in fields} for r in rows),
              fieldnames=fields)
    print(f"daily.json: {len(rows)} rows, {rows[0]['fecha']} -> {latest}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
