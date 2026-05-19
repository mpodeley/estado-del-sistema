---
title: "9. Tu primer aporte de punta a punta"
description: "Caso guiado: una mejora chica completa, con los pedidos sugeridos para el asistente."
sidebar:
  order: 9
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía está en borrador. Te dejamos los objetivos y el índice para que veas qué va a haber acá.

## Qué te vas a llevar

- Tu **primera propuesta de cambio** en GitHub, usando al asistente como copiloto.
- Saber cómo validar el cambio **localmente** antes de subirlo.
- Saber qué esperar mientras la automatización lo procesa.

## El ejercicio propuesto

**Objetivo:** agregar una ciudad nueva al script de clima y verificar que aparece en el promedio de temperatura del forecast.

(Si Rosario no te aplica, al final del módulo hay alternativas igual de simples.)

### Paso a paso

1. **Setup** (una sola vez):
   - Clonar el repo.
   - `npm install` para la web + `pip install -r requirements.txt` para Python.
   - Verificar que `npm run dev` levanta el tablero local.

2. **Crear una rama nueva** para no tocar la versión principal:
   ```bash
   git checkout -b agregar-ciudad-rosario
   ```

3. **Conversación con el asistente** — pedido sugerido para copiar tal cual:

   > Quiero agregar Rosario al fetcher de Open-Meteo. Por favor:
   > 1. Mostrame dónde está la lista actual de ciudades en `scripts/fetch_weather.py`.
   > 2. Proponé el cambio mínimo para sumar Rosario (con su latitud y longitud).
   > 3. Identificá si hay que tocar también `generate_forecast.py` (que usa el promedio de las 10 ciudades).
   > 4. Esperá mi OK antes de tocar nada.

4. **Aprobar el plan** y dejar que edite.

5. **Validar local**:
   ```bash
   python scripts/fetch_weather.py
   python scripts/generate_forecast.py
   npm run dev
   ```
   Mirar que el gráfico de temperatura siga renderizando, y que el forecast esté usando el promedio nuevo.

6. **Guardar (commit) y proponer (PR)**:
   ```bash
   git add -A
   git commit -m "weather: agregar Rosario al fetcher de Open-Meteo"
   git push -u origin agregar-ciudad-rosario
   gh pr create
   ```
   El asistente arma el mensaje del commit y el cuerpo de la propuesta de cambio.

7. **Esperar la automatización**, revisar que el deploy salga verde, mirar el tablero publicado.

## Alternativas más simples

Si lo de Rosario no te aplica, otros primeros aportes razonables:

- Cambiar el orden de los KPIs en la portada.
- Agregar un comentario explicativo a una función de `parse_enargas.py`.
- Mejorar el texto de un cartel de error en algún gráfico.
- Sumar un link nuevo a la Guía del tablero.
