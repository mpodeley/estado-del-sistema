---
title: "4. Las partes de este proyecto"
description: "Tour del repo con links profundos: pipeline Python, frontend React, datos, config."
sidebar:
  order: 4
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Tener un mapa mental de qué carpeta hace qué.
- Saber dónde buscar antes de pedirle un cambio al agente.

## Sumario

1. **Tour del repo en 5 minutos** — `scripts/`, `src/`, `public/data/`, `raw/`, `docs/`, `.github/`.
2. **Pipeline Python** ([`scripts/`](https://github.com/mpodeley/estado-del-sistema/tree/master/scripts)):
   - Orquestador: [`build_data.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/build_data.py).
   - Fetchers: ENARGAS, CAMMESA, Open-Meteo, MEGSA, SMN.
   - Parsers: PDF/XLS → JSON.
   - Modelos: [`generate_forecast.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/generate_forecast.py), [`backtest_forecast.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/backtest_forecast.py).
   - Helpers: [`_meta.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/_meta.py).
3. **Frontend React** ([`src/`](https://github.com/mpodeley/estado-del-sistema/tree/master/src)):
   - Entry: [`main.tsx`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/main.tsx), [`App.tsx`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/App.tsx).
   - Pages: `OperacionPage`, `MapaPage`, `HistoricoPage`, `GuidePage`, `FuentesPage`, `StatusPage`.
   - Hooks: [`useData.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/hooks/useData.ts).
   - Utils: [`charts.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/utils/charts.ts).
   - Theme: [`theme.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/theme.ts).
4. **Datos** ([`public/data/`](https://github.com/mpodeley/estado-del-sistema/tree/master/public/data)) — todos los JSON envueltos en el envelope estándar.
5. **Config** — `package.json`, `tsconfig.json`, `vite.config.ts`, `requirements.txt`, `.github/workflows/update-data.yml`.

## Vertical slice como ejemplo guiado

Vamos a recorrer punta a punta una "rebanada" del proyecto:

```
Open-Meteo (API pública)
   ↓
scripts/fetch_weather.py
   ↓
public/data/weather_regions.json
   ↓
src/hooks/useData.ts → useWeatherRegions()
   ↓
src/components/TemperatureChart.tsx
   ↓
src/components/OperacionPage.tsx
   ↓
Browser
```

Cuando este módulo esté completo, cada paso va a ser un mini-tutorial linkeado al archivo real.
