#!/usr/bin/env python3
"""Fetch 14-day weather forecast for Buenos Aires from Open-Meteo API (free, no key)."""

import os
import json
from datetime import datetime
import requests

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# Open-Meteo free API - Buenos Aires coordinates
API_URL = (
    'https://api.open-meteo.com/v1/forecast'
    '?latitude=-34.6037&longitude=-58.3816'
    '&daily=temperature_2m_max,temperature_2m_min'
    '&timezone=America/Argentina/Buenos_Aires'
    '&forecast_days=14'
)


def fetch_weather():
    os.makedirs(OUT_DIR, exist_ok=True)
    try:
        r = requests.get(API_URL, timeout=15)
        r.raise_for_status()
        raw = r.json()
        daily = raw.get('daily', {})
        dates = daily.get('time', [])
        maxs = daily.get('temperature_2m_max', [])
        mins = daily.get('temperature_2m_min', [])

        forecast = []
        for i, fecha in enumerate(dates):
            t_max = maxs[i] if i < len(maxs) else None
            t_min = mins[i] if i < len(mins) else None
            t_prom = round((t_max + t_min) / 2, 1) if t_max is not None and t_min is not None else None
            forecast.append({
                'fecha': fecha,
                'temp_max': t_max,
                'temp_min': t_min,
                'temp_prom': t_prom,
            })

        result = {
            'fetched': datetime.now().isoformat(),
            'source': 'Open-Meteo API (Buenos Aires)',
            'forecast': forecast,
        }
        out_path = os.path.join(OUT_DIR, 'weather.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"weather.json: {len(forecast)} days of forecast")
        return result

    except Exception as e:
        print(f"Error fetching weather: {e}")
        return None


if __name__ == '__main__':
    fetch_weather()
