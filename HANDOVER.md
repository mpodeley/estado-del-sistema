# HANDOVER — Estado del Sistema Dashboard

**Last session**: 2026-04-20 (session 2)
**By**: Claude Opus 4.6
**Branch**: master
**Live**: https://mpodeley.github.io/estado-del-sistema/
**Repo**: https://github.com/mpodeley/estado-del-sistema

---

## TL;DR

Dashboard operativo para el equipo comercial de gas de Pluspetrol. Outlook del sistema de transporte de gas argentino con forecast automático de demanda basado en temperatura.

**17/22 tareas completadas (77%)**. Lo que falta son mejoras incrementales, no funcionalidad core.

---

## Qué hay hoy

### Páginas
1. **Outlook**: KPIs + comentarios auto-generados + paneles TGS/TGN con estado + forecast de demanda + comparación semanal + charts + tabla de inyecciones
2. **Fuentes**: 9 fuentes de datos listadas con URLs, frecuencia y estado
3. **Estado**: Checklist de avance del proyecto con barra de progreso

### Features implementadas
- **4 KPI cards**: Demanda total, Temp BA, Linepack TGS %, Linepack TGN %
- **Comentarios auto-generados**: diarios (temp, demanda, linepack por sistema, fuel mix) + semanales (rango temp, demanda estimada, prioritaria estimada)
- **Paneles TGS/TGN**: ventana de 3 días con linepack, variación, badges NORMAL/BAJO/ALTO
- **Forecast de demanda**: regresión lineal temp→demanda (14 días), chart con real (sólido) + estimado (punteado) + marca "Hoy"
- **Forecast de temperatura**: Open-Meteo API 14 días, integrado al chart de temperatura
- **Comparación semanal**: Sem N vs N-1 automática (demanda, prioritaria, usinas, temp, inyecciones)
- **Charts**: demanda por sector (stacked area), linepack con bandas min/max, temperatura real+forecast, fuel mix eléctrico (stacked bar)
- **Tabla de inyecciones**: últimos 10 días por fuente (TGS, TGN, ENARSA, GPM, Bolivia)
- **Limpieza de datos**: linepack=0 y demanda=0 tratados como no-publicado, fechas duplicadas eliminadas

### Stack
- **Frontend**: React 19 + TypeScript + Vite 7 + Recharts
- **Data pipeline**: Python 3.12 (openpyxl, pdfplumber, requests, beautifulsoup4)
- **CI/CD**: GitHub Actions cron diario (9 UTC = 6 AM ARG) + trigger manual
- **Hosting**: GitHub Pages (rama `gh-pages`)

---

## Estructura del proyecto

```
estado_del_sistema/
├── scripts/                        # Python data pipeline
│   ├── build_data.py               # Orquestador: corre todo en secuencia
│   ├── fetch_enargas.py            # Descarga PDF semanal ENARGAS
│   ├── fetch_cammesa.py            # Descarga PDF semanal CAMMESA
│   ├── fetch_weather.py            # 14 días forecast Open-Meteo API
│   ├── parse_base_excel.py         # Excel base → daily.json (con limpieza)
│   ├── parse_linepack.py           # Linepack Excel → linepack.json
│   ├── parse_enargas.py            # ENARGAS PDF → enargas.json
│   ├── parse_cammesa.py            # CAMMESA PDF → cammesa_weekly.json
│   └── generate_forecast.py        # Regresión + forecast + auto-comments
├── public/data/                    # JSONs generados (committed)
│   ├── daily.json                  # 23 días limpios de datos operativos
│   ├── comments.json               # Comentarios auto-generados
│   ├── weather.json                # Forecast 14 días BA
│   ├── demand_forecast.json        # Demanda estimada + regresión
│   ├── linepack.json               # Linepack TGN equilibrio
│   ├── enargas.json                # Último reporte ENARGAS parseado
│   └── cammesa_weekly.json         # Última proyección CAMMESA parseada
├── raw/                            # Archivos fuente (Excel, PDF)
├── src/                            # React app
│   ├── App.tsx                     # Router con tabs + layout outlook
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── KPICards.tsx
│   │   ├── SystemPanel.tsx         # Panel 3 días TGS/TGN con estado
│   │   ├── WeeklyComparison.tsx    # Tabla Sem N vs N-1
│   │   ├── DemandChart.tsx         # Stacked area demanda por sector
│   │   ├── DemandForecastChart.tsx # Real + estimada con marca Hoy
│   │   ├── LinepackChart.tsx       # Line con bandas min/max
│   │   ├── TemperatureChart.tsx    # Real + forecast punteado
│   │   ├── FuelMixChart.tsx        # Stacked bar combustibles
│   │   ├── InjectionsTable.tsx     # Tabla inyecciones
│   │   ├── CommentsSection.tsx     # Comentarios operativos
│   │   ├── FuentesPage.tsx         # Lista de fuentes
│   │   └── StatusPage.tsx          # Checklist de avance
│   ├── hooks/useData.ts            # Fetch JSONs + tipos forecast
│   └── types.ts                    # TypeScript interfaces
├── .github/workflows/
│   └── update-data.yml             # Cron diario + manual trigger
├── requirements.txt                # Python deps
├── package.json                    # Node deps
└── HANDOVER.md                     # Este archivo
```

---

## Python

Python 3.12 está instalado pero el alias de Windows redirige a Microsoft Store (bloqueada). Usar path directo:
```bash
"/c/Users/mpodeley/AppData/Local/Programs/Python/Python312/python.exe"
```

pip funciona con:
```bash
"/c/Users/mpodeley/AppData/Local/Programs/Python/Python312/python.exe" -m pip install <paquete>
```

---

## Modelo de forecast

**Regresión lineal simple** calibrada con ~19 puntos de datos históricos:

| Variable | Coeficiente | Intercept | R² |
|---|---|---|---|
| Prioritaria | -0.809 MMm3/°C | 39.5 | 0.45 |
| Usinas | +1.586 MMm3/°C | 6.5 | 0.43 |
| Demanda total | +0.651 MMm3/°C | 105.9 | 0.08 |

- Prioritaria baja con temperatura (calefacción)
- Usinas suben con temperatura (aire acondicionado)
- Demanda total tiene R² bajo porque los dos efectos se compensan parcialmente

**Para mejorar**: más datos históricos, variable día-de-semana (demanda industrial cae fines de semana), feriados, tendencia estacional.

---

## Qué falta (5 items pendientes)

1. **Restricciones de transporte** — Datos de Gas Andes, CCO, TGS NQN están en el Excel (sheet Datos, cols CD-CI). Parsear y agregar panel al dashboard.
2. **Inyección GNL y stock** — Datos disponibles en el Excel. Agregar tercer panel tipo SystemPanel.
3. **Exportaciones CAMMESA** — Fuente exacta de volumen y destino por confirmar con Rodrigo Manassero.
4. **Mejorar modelo de demanda** — Más datos históricos, día de semana, feriados. El R² de demanda total (0.08) es bajo.
5. **Dominio custom** — Configurar `estadodelsistema.podeley.ar` como CNAME en GitHub Pages.

---

## Deploy manual

```bash
# Regenerar datos:
"/c/Users/mpodeley/AppData/Local/Programs/Python/Python312/python.exe" scripts/build_data.py

# Build + deploy:
npm run build && npx gh-pages -d dist

# O solo push a master → GitHub Actions hace el resto automáticamente
git push origin master
```

---

## Datos del Excel (referencia)

Sheet "Conv. valores" — headers en row 2, datos desde row 3:
- Col B: FECHA
- Col C-G: Demanda (Total, Prioritaria, Industria, Usinas, Exportaciones)
- Col H-N: Inyecciones (TGS, TGN, ENARSA, GPM, Bolivia, ESCOBAR, Total)
- Col O-V: Linepack (TGS actual/var/lim, TGN actual/var/lim)
- Col W-AF: Linepack total + tramos finales
- Col AG-AL: Temperatura (BA min/max/prom, Esquel min/max/prom)
- Col AM-AQ: CAMMESA fuel mix (Gas, Gasoil, Fuel Oil, Carbón, Total)

**Nota**: linepack=0 y demanda=0 en el Excel significan "no publicado", no cero real. El parser los convierte a null.

---

## Fuentes de datos

| Fuente | URL | Frecuencia | Estado |
|---|---|---|---|
| ENARGAS proyección | enargas.gob.ar/secciones/transporte-y-distribucion/ | Semanal | Scraper listo |
| CAMMESA semanal | cammesaweb.cammesa.com/programacion-semanal/ | Semanal | Scraper listo |
| CAMMESA diario | cammesaweb.cammesa.com/programacion-diaria/ | Diaria | Pendiente |
| CAMMESA resultados | cammesaweb.cammesa.com/reportes-resultados/ | Diaria | Pendiente |
| Open-Meteo (temp) | api.open-meteo.com | Continua | Activa |
| Excel base | Manual | Manual | Activa |
| Linepack Excel | Manual | Manual | Activa |
