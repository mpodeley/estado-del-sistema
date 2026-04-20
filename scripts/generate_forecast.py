#!/usr/bin/env python3
"""Generate demand forecast from weather forecast + historical regression.
Also generates auto-comments for the outlook."""

import os
import json
from datetime import datetime

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')


def linear_regression(pairs):
    """Simple OLS regression. Returns (slope, intercept, r2)."""
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


def generate_forecast():
    # Load historical daily data
    daily_path = os.path.join(OUT_DIR, 'daily.json')
    weather_path = os.path.join(OUT_DIR, 'weather.json')

    if not os.path.exists(daily_path):
        print("No daily.json found")
        return
    if not os.path.exists(weather_path):
        print("No weather.json found - run fetch_weather.py first")
        return

    with open(daily_path, encoding='utf-8') as f:
        daily = json.load(f)
    with open(weather_path, encoding='utf-8') as f:
        weather = json.load(f)

    forecast_days = weather.get('forecast', [])
    if not forecast_days:
        print("No forecast data")
        return

    # Build regression: temp_prom_ba -> prioritaria
    pairs_prior = [(d['temp_prom_ba'], d['prioritaria'])
                   for d in daily if d.get('temp_prom_ba') and d.get('prioritaria')]
    slope_p, int_p, r2_p = linear_regression(pairs_prior)

    # Build regression: temp_prom_ba -> demanda_total
    pairs_total = [(d['temp_prom_ba'], d['demanda_total'])
                   for d in daily if d.get('temp_prom_ba') and d.get('demanda_total')]
    slope_t, int_t, r2_t = linear_regression(pairs_total)

    # Build regression: temp_prom_ba -> usinas
    pairs_usinas = [(d['temp_prom_ba'], d['usinas'])
                    for d in daily if d.get('temp_prom_ba') and d.get('usinas')]
    slope_u, int_u, r2_u = linear_regression(pairs_usinas)

    print(f"Regressions (n={len(pairs_prior)} points):")
    if slope_p is not None:
        print(f"  Prioritaria = {slope_p:.3f} * Temp + {int_p:.1f}  (R2={r2_p:.2f})")
    if slope_t is not None:
        print(f"  Demanda Tot = {slope_t:.3f} * Temp + {int_t:.1f}  (R2={r2_t:.2f})")
    if slope_u is not None:
        print(f"  Usinas      = {slope_u:.3f} * Temp + {int_u:.1f}  (R2={r2_u:.2f})")

    # Generate forecast
    demand_forecast = []
    for day in forecast_days:
        temp = day.get('temp_prom')
        if temp is None:
            continue
        entry = {
            'fecha': day['fecha'],
            'temp_prom': temp,
            'temp_max': day.get('temp_max'),
            'temp_min': day.get('temp_min'),
        }
        if slope_p is not None:
            entry['prioritaria_est'] = round(slope_p * temp + int_p, 1)
        if slope_t is not None:
            entry['demanda_total_est'] = round(slope_t * temp + int_t, 1)
        if slope_u is not None:
            entry['usinas_est'] = round(slope_u * temp + int_u, 1)
        demand_forecast.append(entry)

    result = {
        'generated': datetime.now().isoformat(),
        'regression': {
            'n_points': len(pairs_prior),
            'prioritaria': {'slope': round(slope_p, 3) if slope_p else None, 'intercept': round(int_p, 1) if int_p else None, 'r2': round(r2_p, 3) if r2_p else None},
            'demanda_total': {'slope': round(slope_t, 3) if slope_t else None, 'intercept': round(int_t, 1) if int_t else None, 'r2': round(r2_t, 3) if r2_t else None},
        },
        'forecast': demand_forecast,
    }

    with open(os.path.join(OUT_DIR, 'demand_forecast.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"demand_forecast.json: {len(demand_forecast)} days")

    # Generate auto-comments
    generate_comments(daily, demand_forecast, result['regression'])


def generate_comments(daily, demand_forecast, regression):
    """Generate auto-comments for the outlook based on data."""
    valid = [d for d in daily if d.get('demanda_total')]
    if not valid:
        return

    latest = valid[-1]
    prev = valid[-2] if len(valid) > 1 else None

    lines_daily = []
    lines_weekly = []

    # Temperature comment
    if latest.get('temp_prom_ba'):
        temp = latest['temp_prom_ba']
        lines_daily.append(
            f"Temperatura promedio en Buenos Aires: {temp:.0f} C "
            f"(min {latest.get('temp_min_ba', '?')}, max {latest.get('temp_max_ba', '?')})."
        )

    # Demand comment
    if latest.get('demanda_total'):
        dem = latest['demanda_total']
        change = ""
        if prev and prev.get('demanda_total'):
            delta = dem - prev['demanda_total']
            change = f" ({'suba' if delta > 0 else 'baja'} de {abs(delta):.1f} MMm3/d vs dia anterior)"
        lines_daily.append(f"Demanda total del sistema: {dem:.1f} MMm3/dia{change}.")

    # Linepack comment
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

    # Fuel mix
    if latest.get('cammesa_gas') is not None:
        gas = latest['cammesa_gas']
        total = latest.get('cammesa_total', gas)
        pct = (gas / total * 100) if total else 0
        lines_daily.append(f"Despacho electrico: gas natural {gas:.1f} GWh ({pct:.0f}% del total).")

    # Weekly forecast
    if demand_forecast:
        temps = [d['temp_prom'] for d in demand_forecast[:7] if d.get('temp_prom')]
        dems = [d.get('demanda_total_est') for d in demand_forecast[:7] if d.get('demanda_total_est')]
        if temps:
            min_t = min(temps)
            max_t = max(temps)
            lines_weekly.append(
                f"Pronostico de temperatura para los proximos 7 dias: "
                f"rango {min_t:.0f}-{max_t:.0f} C (promedio {sum(temps)/len(temps):.1f} C)."
            )
        if dems:
            lines_weekly.append(
                f"Demanda total estimada para la semana: {min(dems):.0f}-{max(dems):.0f} MMm3/dia "
                f"(basado en regresion temperatura-demanda con {regression.get('n_points', '?')} datos historicos)."
            )
            # Priority demand
            prios = [d.get('prioritaria_est') for d in demand_forecast[:7] if d.get('prioritaria_est')]
            if prios:
                lines_weekly.append(
                    f"Demanda prioritaria estimada: {min(prios):.0f}-{max(prios):.0f} MMm3/dia."
                )

    auto_comments = {
        'daily': lines_daily,
        'weekly': lines_weekly,
        'generated': datetime.now().isoformat(),
        'note': 'Comentarios generados automaticamente. Ultima actualizacion: ' + latest['fecha'],
    }

    with open(os.path.join(OUT_DIR, 'comments.json'), 'w', encoding='utf-8') as f:
        json.dump(auto_comments, f, ensure_ascii=False, indent=2)
    print(f"comments.json: {len(lines_daily)} daily + {len(lines_weekly)} weekly auto-comments")


if __name__ == '__main__':
    generate_forecast()
