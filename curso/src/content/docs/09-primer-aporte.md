---
title: "9. Tu primer aporte de punta a punta"
description: "Caso guiado: una mejora chica end-to-end, con los prompts sugeridos para el agente."
sidebar:
  order: 9
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Hacer tu primer Pull Request usando solo el agente como copiloto.
- Validar el cambio localmente antes de pushear.
- Saber qué esperar mientras la GitHub Action lo procesa.

## Sumario (tarea guiada propuesta)

**Objetivo del ejercicio:** agregar una ciudad al fetcher de Open-Meteo y verificar que aparece en el promedio de temperatura del forecast.

### Pasos sugeridos

1. **Setup** (una sola vez):
   - Clonar el repo.
   - `npm install` + `pip install -r requirements.txt`.
   - Verificar que `npm run dev` levanta el tablero.
2. **Branch nueva**:
   ```
   git checkout -b agregar-ciudad-rosario
   ```
3. **Conversación con el agente** — prompt sugerido:
   > "Quiero agregar Rosario al fetcher de Open-Meteo. Por favor:
   > 1. Mostrame dónde está la lista de ciudades actual en `scripts/fetch_weather.py`.
   > 2. Proponé el cambio mínimo para sumar Rosario (lat/lon correctos).
   > 3. Identificá si hay que tocar `generate_forecast.py` (uso del promedio de 10 ciudades).
   > 4. Esperá mi OK antes de editar."
4. **Aprobar el plan** y dejar que edite.
5. **Validar localmente**:
   ```
   python scripts/fetch_weather.py
   python scripts/generate_forecast.py
   npm run dev
   ```
   Ver que el chart de Temperatura siga renderizando y que el forecast use el nuevo promedio.
6. **Commit y PR**:
   ```
   git add -A
   git commit -m "weather: agregar Rosario al fetcher de Open-Meteo"
   git push -u origin agregar-ciudad-rosario
   gh pr create
   ```
   (el agente arma el mensaje y el cuerpo del PR).
7. **Esperar a la GitHub Action**, revisar el deploy en Pages.

## Variantes alternativas

Si Rosario no aplica, otros primeros aportes razonables:
- Cambiar el orden de los KPIs en la portada.
- Agregar un comentario explicativo a una función de `parse_enargas.py`.
- Mejorar el copy de un cartel de error en algún chart.
- Sumar un link a la Guía.
