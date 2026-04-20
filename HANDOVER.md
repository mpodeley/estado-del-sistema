# HANDOVER — Estado del Sistema Dashboard

**Last session**: 2026-04-20
**By**: Claude Opus 4.6
**Branch**: master
**Live**: https://mpodeley.github.io/estado-del-sistema/
**Repo**: https://github.com/mpodeley/estado-del-sistema

---

## Qué hay hoy

Dashboard operativo React para el equipo comercial de gas de Pluspetrol. Muestra el estado del sistema de transporte de gas argentino: linepack, demanda, inyecciones, temperatura, despacho eléctrico.

### Páginas
1. **Outlook**: KPIs + comentarios operativos + paneles TGS/TGN con estado (NORMAL/BAJO/ALTO) + comparación semanal + charts de soporte + tabla de inyecciones
2. **Fuentes**: 9 fuentes de datos listadas con URLs, frecuencia y estado (activa/pendiente)
3. **Estado**: 15 tareas con progreso (6/15 = 40% completado)

### Stack
- React 19 + TypeScript + Vite 7
- Recharts para charts
- Python (openpyxl, pdfplumber) para parseo de datos
- GitHub Pages para hosting (rama `gh-pages`)

### Estructura
```
estado_del_sistema/
├── scripts/                    # Python parsers
│   ├── parse_base_excel.py     # Excel → daily.json + comments.json
│   └── parse_linepack.py       # Linepack Excel → linepack.json
├── public/data/                # JSONs generados (committed)
│   ├── daily.json              # 32 días de datos operativos
│   ├── comments.json           # Comentarios diarios y semanales
│   └── linepack.json           # Linepack TGN equilibrio
├── raw/                        # Datos fuente (Excel, PDF)
├── src/                        # React app
│   ├── App.tsx                 # Router + layout con tabs
│   ├── components/
│   │   ├── Header.tsx          # Título + fecha
│   │   ├── KPICards.tsx        # 4 KPIs: demanda, temp, linepack TGS/TGN
│   │   ├── SystemPanel.tsx     # Panel 3 días con estado por sistema
│   │   ├── WeeklyComparison.tsx # Tabla Sem N vs N-1
│   │   ├── DemandChart.tsx     # Stacked area: prioritaria/industria/usinas/export
│   │   ├── LinepackChart.tsx   # Line + bandas min/max
│   │   ├── TemperatureChart.tsx # Min/max/prom BA
│   │   ├── FuelMixChart.tsx    # Stacked bar: gas/gasoil/fuel/carbón
│   │   ├── InjectionsTable.tsx # Tabla últimos 10 días
│   │   ├── CommentsSection.tsx # Comentarios operativos
│   │   ├── FuentesPage.tsx     # Lista de fuentes de datos
│   │   └── StatusPage.tsx      # Checklist de avance
│   ├── hooks/useData.ts        # Fetch JSONs
│   └── types.ts                # TypeScript interfaces
└── .github/workflows/          # (vacío, pendiente GitHub Actions)
```

### Python
Python 3.12 está instalado pero el alias de Windows lo bloquea. Usar path directo:
```
"/c/Users/mpodeley/AppData/Local/Programs/Python/Python312/python.exe"
```

---

## Qué falta (en orden de prioridad)

### Scrapers (Fase 3 del plan original)
1. **fetch_enargas.py** — Descargar PDF semanal de ENARGAS. URL: `enargas.gob.ar/secciones/transporte-y-distribucion/dod-proyeccion-semanal.php`. Pattern de archivo: `ETGS{timestamp}.pdf`
2. **parse_enargas.py** — Parsear con pdfplumber: demanda, inyecciones, linepack, temp proyectada
3. **fetch_cammesa.py** — Descargar PDFs de CAMMESA (semanal + diario). Pattern: `PS_YYYYMMDD.pdf`
4. **parse_cammesa.py** — Parsear: despacho de combustibles, demanda eléctrica
5. **fetch_weather.py** — Scrape meteored.com.ar para pronóstico 14 días

### Forecast automático
6. **Regresión temp→demanda** — Los datos históricos en el Excel tienen correlación temp/demanda prioritaria (coeficiente ~-0.4 según nota del Excel). Implementar regresión lineal simple para forecast de demanda a partir de pronóstico de temperatura.
7. **Comentarios auto-generados** — Template que llene con datos del día: "Temperatura máxima en BA de X°C. Demanda total estimada en Y MMm3/día. Linepack TGS en Z MMm3 (estado: NORMAL)."

### Datos adicionales
8. **Restricciones de transporte** — Datos de Gas Andes, CCO, TGS NQN están en el Excel (sheet Datos, cols CD-CI). Parsear y agregar panel.
9. **Inyección GNL y stock** — Datos disponibles, integrar.
10. **Exportaciones CAMMESA** — Fuente exacta por confirmar.

### Automatización
11. **GitHub Actions** — Cron diario 9:00 UTC: Python fetch/parse → commit JSONs → npm build → deploy gh-pages
12. **workflow_dispatch** — Trigger manual para updates on-demand

---

## Datos del Excel (referencia para parsers)

Sheet "Conv. valores" — headers en row 2, datos desde row 3:
- Col B: FECHA
- Col C-G: Demanda (Total, Prioritaria, Industria, Usinas, Exportaciones)
- Col H-N: Inyecciones (TGS, TGN, ENARSA, GPM, Bolivia, ESCOBAR, Total)
- Col O-Z: Linepack (TGS actual/var/lim, TGN actual/var/lim, Total)
- Col AA-AF: Tramos finales (TGS/TGN + límites)
- Col AG-AL: Temperatura (BA min/max/prom, Esquel min/max/prom)
- Col AM-AQ: CAMMESA fuel mix (Gas, Gasoil, Fuel Oil, Carbón, Total)

Sheet "Datos" — ~100 cols, 625 rows, fuente master. Incluye:
- Cols CD-CI: Gas Andes, CCO, TGS NQN (restricciones)
- Fórmulas de regresión temp→demanda en headers

---

## Deploy

```bash
# Build y deploy manual:
npm run build && npx gh-pages -d dist

# O push a master y trigger manual en GitHub Actions (cuando esté configurado)
```
