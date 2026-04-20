#!/usr/bin/env python3
"""Generate demand forecast from weather forecast + historical regression.
Also generates auto-comments for the outlook.

We fit one regression per target (prioritaria, demanda_total, usinas) against
Buenos Aires mean temperature. With only ~20 days of demand history the
results for demanda_total are noisy (R² around 0.1); the UI surfaces that
caveat so users don't over-trust the number.

When we eventually have 1+ year of demand history (via RDS backfill or more
Excel data) this is the natural place to upgrade the model — add features
like day-of-week, temperature anomaly vs climatology, holiday flag, etc.
"""

import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _meta import write_json  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')


def load_envelope(path):
    with open(path, encoding='utf-8') as f:
        raw = json.load(f)
    if isinstance(raw, dict) and 'data' in raw and 'generated_at' in raw:
        return raw['data']
    return raw


def linear_regression(pairs):
    """Simple OLS. Returns (slope, intercept, r2)."""
    n = len(pairs)
    if n < 3:
        return None, None, None
    sx = sum(x for x, _ in pairs)
    sy = sum(y for _, y in pairs)
    sxy = sum(x * y for x, y in pairs)
    sx2 = sum(x ** 2 for x, _ in pairs)
    denom = n * sx2 - sx ** 2
    if abs(denom) < 1e-10:
        return None, None, None
    slope = (n * sxy - sx * sy) / denom
    intercept = (sy - slope * sx) / n
    mean_y = sy / n
    ss_tot = sum((y - mean_y) ** 2 for _, y in pairs)
    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in pairs)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
    return slope, intercept, r2


def fit(daily, key):
    pairs = [(d['temp_prom_ba'], d[key])
             for d in daily if d.get('temp_prom_ba') is not None and d.get(key) is not None]
    slope, intercept, r2 = linear_regression(pairs)
    return {
        'slope': round(slope, 3) if slope is not None else None,
        'intercept': round(intercept, 1) if intercept is not None else None,
        'r2': round(r2, 3) if r2 is not None else None,
        'n_points': len(pairs),
    }


def predict(model, temp):
    if model['slope'] is None or model['intercept'] is None or temp is None:
        return None
    return round(model['slope'] * temp + model['intercept'], 1)


def generate_forecast():
    daily_path = os.path.join(OUT_DIR, 'daily.json')
    weather_path = os.path.join(OUT_DIR, 'weather.json')
    if not os.path.exists(daily_path) or not os.path.exists(weather_path):
        print("Missing daily.json or weather.json", file=sys.stderr)
        return

    daily = load_envelope(daily_path)
    weather = load_envelope(weather_path)
    forecast_days = weather.get('forecast', []) if isinstance(weather, dict) else []
    if not forecast_days:
        return

    models = {
        'prioritaria': fit(daily, 'prioritaria'),
        'demanda_total': fit(daily, 'demanda_total'),
        'usinas': fit(daily, 'usinas'),
    }

    print(f"Regressions (fit over last {len(daily)} days):")
    for key, m in models.items():
        print(f"  {key:12s} = {m['slope']} * Temp + {m['intercept']}  (R²={m['r2']}, n={m['n_points']})")

    demand_forecast = []
    for day in forecast_days:
        temp = day.get('temp_prom')
        if temp is None:
            continue
        demand_forecast.append({
            'fecha': day['fecha'],
            'temp_prom': temp,
            'temp_max': day.get('temp_max'),
            'temp_min': day.get('temp_min'),
            'prioritaria_est': predict(models['prioritaria'], temp),
            'demanda_total_est': predict(models['demanda_total'], temp),
            'usinas_est': predict(models['usinas'], temp),
        })

    write_json(
        os.path.join(OUT_DIR, 'demand_forecast.json'),
        {
            'forecast': demand_forecast,
            'regression': {
                'n_points': models['prioritaria']['n_points'],
                'prioritaria': models['prioritaria'],
                'demanda_total': models['demanda_total'],
                'usinas': models['usinas'],
            },
        },
        source='regression on daily.json + weather.json',
        source_date=demand_forecast[0]['fecha'] if demand_forecast else None,
    )
    print(f"demand_forecast.json: {len(demand_forecast)} days")

    generate_comments(daily, demand_forecast, models)


def generate_comments(daily, demand_forecast, models):
    valid = [d for d in daily if d.get('demanda_total')]
    if not valid:
        return

    latest = valid[-1]
    prev = valid[-2] if len(valid) > 1 else None

    lines_daily = []
    lines_weekly = []

    if latest.get('temp_prom_ba'):
        temp = latest['temp_prom_ba']
        lines_daily.append(
            f"Temperatura promedio en Buenos Aires: {temp:.0f} C "
            f"(min {latest.get('temp_min_ba', '?')}, max {latest.get('temp_max_ba', '?')})."
        )

    if latest.get('demanda_total'):
        dem = latest['demanda_total']
        change = ""
        if prev and prev.get('demanda_total'):
            delta = dem - prev['demanda_total']
            change = f" ({'suba' if delta > 0 else 'baja'} de {abs(delta):.1f} MMm3/d vs dia anterior)"
        lines_daily.append(f"Demanda total del sistema: {dem:.1f} MMm3/dia{change}.")

    for sys_name, lp_key, var_key, inf_key, sup_key in [
        ('TGS', 'linepack_tgs', 'var_linepack_tgs', 'lim_inf_tgs', 'lim_sup_tgs'),
        ('TGN', 'linepack_tgn', 'var_linepack_tgn', 'lim_inf_tgn', 'lim_sup_tgn'),
    ]:
        lp = latest.get(lp_key)
        var = latest.get(var_key)
        inf = latest.get(inf_key)
        sup = latest.get(sup_key)
        if lp is not None:
            status = "NORMAL"
            if inf and lp < inf:
                status = "BAJO LIMITE"
            elif sup and lp > sup:
                status = "SOBRE LIMITE"
            var_str = f", variacion {var:+.1f}" if var else ""
            lines_daily.append(f"Linepack {sys_name}: {lp:.1f} MMm3{var_str} - Estado: {status} (limites: {inf}-{sup}).")

    if latest.get('cammesa_gas') is not None:
        gas = latest['cammesa_gas']
        total = latest.get('cammesa_total', gas)
        pct = (gas / total * 100) if total else 0
        lines_daily.append(f"Despacho electrico: gas natural {gas:.1f} GWh ({pct:.0f}% del total).")

    if demand_forecast:
        temps = [d['temp_prom'] for d in demand_forecast[:7] if d.get('temp_prom')]
        dems = [d.get('demanda_total_est') for d in demand_forecast[:7] if d.get('demanda_total_est')]
        if temps:
            lines_weekly.append(
                f"Pronostico de temperatura para los proximos 7 dias: "
                f"rango {min(temps):.0f}-{max(temps):.0f} C (promedio {sum(temps)/len(temps):.1f} C)."
            )
        if dems:
            r2 = models['demanda_total']['r2']
            caveat = ''
            if r2 is not None and r2 < 0.3:
                caveat = f' (indicativo; R²={r2} — pocos datos históricos)'
            lines_weekly.append(
                f"Demanda total estimada para la semana: {min(dems):.0f}-{max(dems):.0f} MMm3/dia{caveat}."
            )
            prios = [d.get('prioritaria_est') for d in demand_forecast[:7] if d.get('prioritaria_est')]
            if prios:
                lines_weekly.append(
                    f"Demanda prioritaria estimada: {min(prios):.0f}-{max(prios):.0f} MMm3/dia."
                )

    auto_comments = {
        'daily': lines_daily,
        'weekly': lines_weekly,
        'note': 'Comentarios generados automaticamente. Ultima actualizacion: ' + latest['fecha'],
    }

    write_json(
        os.path.join(OUT_DIR, 'comments.json'),
        auto_comments,
        source='auto-generated by generate_forecast.py',
        source_date=latest['fecha'],
    )
    print(f"comments.json: {len(lines_daily)} daily + {len(lines_weekly)} weekly auto-comments")


if __name__ == '__main__':
    generate_forecast()
