// Single source of truth for every dataset the dashboard exposes.
//
// FuentesPage.tsx renders directly from this catalog. Keep entries in sync
// with docs/datasets/*.md and with the files actually written by the Python
// pipeline under public/data/. Adding a new dataset means:
//   1) the fetcher/parser writes both JSON and CSV to public/data/
//   2) a Markdown ficha lands in docs/datasets/
//   3) a new entry gets added here

export type DatasetKind = 'auto' | 'manual' | 'blocked' | 'discarded'

export interface ScriptRef {
  file: string // path relative to repo root, e.g. "scripts/fetch_enargas.py"
  purpose: string // one-liner describing what the script does
}

export interface DatasetEntry {
  id: string
  name: string
  shortDescription: string // 2-3 lines shown inline in the card
  kind: DatasetKind
  frequency: string // e.g. "Diaria", "Semanal", "Manual"
  sourceUrl?: string // URL oficial del dato público
  jsonPath?: string // "./data/enargas.json" — served from the deploy
  csvPath?: string // "./data/enargas.csv" — primary download
  extraCsvPaths?: { label: string; path: string }[] // for datasets split into multiple CSVs
  docRepoPath?: string // "docs/datasets/enargas.md" (rendered by GitHub)
  scripts: ScriptRef[]
  freshnessKey?: FreshnessKey // which hook provides generated_at (if any)
}

// Keys that map to useData hooks in FuentesPage. Only datasets that actually
// drive a hook need one; others can skip this and show just the download links.
export type FreshnessKey =
  | 'daily'
  | 'weather'
  | 'weatherRegions'
  | 'rds'
  | 'ing'
  | 'cammesaWeekly'
  | 'cammesaPPO'
  | 'smn'
  | 'megsa'

export const CATALOG: DatasetEntry[] = [
  {
    id: 'enargas',
    name: 'ENARGAS — Reporte Diario del Sistema (RDS)',
    shortDescription:
      'El reporte diario público de ENARGAS: linepack total, importaciones por punto, exportaciones, consumo estimado por segmento (prioritaria, CAMMESA, industria, GNC, combustible) y temperatura de Buenos Aires. Backfill de 2 años completo.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl:
      'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-reporte-diario-sistema.php',
    jsonPath: './data/enargas.json',
    csvPath: './data/enargas.csv',
    docRepoPath: 'docs/datasets/enargas.md',
    freshnessKey: 'rds',
    scripts: [
      {
        file: 'scripts/fetch_enargas.py',
        purpose: 'Descarga los últimos PDFs RDS de ENARGAS a raw/.',
      },
      {
        file: 'scripts/parse_enargas.py',
        purpose: 'Parsea cada PDF con pdfplumber y upserta por fecha en el JSON.',
      },
      {
        file: 'scripts/backfill_enargas.py',
        purpose: 'One-shot: trae hasta 2 años de histórico reutilizando extract_rds().',
      },
    ],
  },
  {
    id: 'enargas_ing',
    name: 'ENARGAS — Inyección Nacional por Gasoducto (ING)',
    shortDescription:
      'PDF diario del Power BI de ENARGAS con inyección por gasoducto: San Martín, Neuba I, Neuba II, GPFM (Perito Moreno) operados por TGS, Centro Oeste y Norte por TGN. Cada reporte incluye 8 días reales (R) y 5 programados (P). 18 meses de histórico disponibles.',
    kind: 'auto',
    frequency: 'Diaria (días hábiles)',
    sourceUrl:
      'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-graficos-de-programacion-items.php?cat=6',
    jsonPath: './data/enargas_ing.json',
    csvPath: './data/enargas_ing.csv',
    freshnessKey: 'ing',
    scripts: [
      {
        file: 'scripts/fetch_enargas_ing.py',
        purpose: 'Descarga los últimos PDFs ING_YYYYMMDD.pdf a raw/.',
      },
      {
        file: 'scripts/parse_enargas_ing.py',
        purpose: 'Extrae con pdfplumber 6 series (gasoductos) por fecha usando posiciones X/Y de los labels.',
      },
      {
        file: 'scripts/backfill_enargas_ing.py',
        purpose: 'Walk-back configurable; cada PDF cubre 13-16 días con upsert por fecha.',
      },
    ],
  },
  {
    id: 'enargas_monthly',
    name: 'ENARGAS — Estadísticas mensuales (GRT / GED / Contratos)',
    shortDescription:
      'Datos estadísticos mensuales de ENARGAS: gas recibido por cuenca y por gasoducto, gas entregado por distribuidora, contratos de transporte firme. 15 años de historia.',
    kind: 'auto',
    frequency: 'Diaria (origen mensual)',
    sourceUrl:
      'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/datos-operativos.php',
    jsonPath: './data/enargas_monthly.json',
    extraCsvPaths: [
      { label: 'CSV — gas recibido por cuenca', path: './data/enargas_monthly_cuenca.csv' },
      { label: 'CSV — gas recibido por gasoducto', path: './data/enargas_monthly_gasoducto.csv' },
      { label: 'CSV — contratos firmes', path: './data/enargas_monthly_contratos.csv' },
      { label: 'CSV — gas entregado por distribuidora', path: './data/enargas_monthly_entregado.csv' },
    ],
    docRepoPath: 'docs/datasets/enargas_monthly.md',
    scripts: [
      {
        file: 'scripts/fetch_enargas_estadisticas.py',
        purpose: 'Descarga GRT/GED/Contratos XLSX y los parsea con openpyxl.',
      },
    ],
  },
  {
    id: 'cammesa_ppo',
    name: 'CAMMESA — Parte Post Operativo (PPO) diario',
    shortDescription:
      'Consumo agregado diario de combustibles (gas, carbón, fueloil, gasoil) y generación neta de todas las centrales térmicas del MEM. Reemplaza el fuel-mix que antes venía del Excel manual.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl: 'https://cammesaweb.cammesa.com/reportes-resultados-de-operaciones/',
    jsonPath: './data/cammesa_ppo.json',
    csvPath: './data/cammesa_ppo.csv',
    docRepoPath: 'docs/datasets/cammesa_ppo.md',
    freshnessKey: 'cammesaPPO',
    scripts: [
      {
        file: 'scripts/fetch_cammesa_ppo.py',
        purpose:
          'Lista documentos de la API pública de CAMMESA, descarga los .xls (password default VelvetSweatshop), decripta y agrega las centrales.',
      },
    ],
  },
  {
    id: 'cammesa_weekly',
    name: 'CAMMESA — Programación semanal (PS_)',
    shortDescription:
      'Pronóstico oficial 7 días: demanda total y por segmento, temperatura, inyecciones, stock. Útil para comparar contra el forecast propio.',
    kind: 'auto',
    frequency: 'Semanal',
    sourceUrl: 'https://cammesaweb.cammesa.com/programacion-semanal/',
    jsonPath: './data/cammesa_weekly.json',
    csvPath: './data/cammesa_weekly.csv',
    docRepoPath: 'docs/datasets/cammesa_weekly.md',
    freshnessKey: 'cammesaWeekly',
    scripts: [
      { file: 'scripts/fetch_cammesa.py', purpose: 'Descarga el PDF PS_ más reciente a raw/.' },
      {
        file: 'scripts/parse_cammesa.py',
        purpose: 'Parsea con pdfplumber y extrae la tabla de los 7 días.',
      },
    ],
  },
  {
    id: 'weather',
    name: 'Open-Meteo — Forecast Buenos Aires (14 días)',
    shortDescription:
      'Pronóstico meteorológico 14 días para Buenos Aires. Se mantiene por compatibilidad con charts viejos; weather_regions cubre lo mismo para 10 ciudades.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl: 'https://open-meteo.com/',
    jsonPath: './data/weather.json',
    csvPath: './data/weather.csv',
    docRepoPath: 'docs/datasets/weather.md',
    freshnessKey: 'weather',
    scripts: [
      {
        file: 'scripts/fetch_weather.py',
        purpose: 'Consulta el endpoint público de Open-Meteo para las 10 ciudades.',
      },
    ],
  },
  {
    id: 'weather_regions',
    name: 'Open-Meteo — 10 ciudades (14 días)',
    shortDescription:
      'Pronóstico 14 días para BA, Rosario, Córdoba, Santa Fe, Mendoza, Neuquén, Bahía Blanca, Esquel, Salta y Tucumán. Cubre centros de demanda, puntos de producción y entradas del norte.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl: 'https://open-meteo.com/',
    jsonPath: './data/weather_regions.json',
    csvPath: './data/weather_regions.csv',
    docRepoPath: 'docs/datasets/weather_regions.md',
    freshnessKey: 'weatherRegions',
    scripts: [
      { file: 'scripts/fetch_weather.py', purpose: 'Una llamada por ciudad al endpoint forecast.' },
    ],
  },
  {
    id: 'weather_history',
    name: 'Open-Meteo — Histórico 2 años × 10 ciudades',
    shortDescription:
      'Temperatura diaria 2 años para las mismas 10 ciudades. Es el insumo de entrenamiento del forecast de demanda (la media simple de 10 ciudades mejoró el R² de prioritaria de 0.82 a 0.89).',
    kind: 'auto',
    frequency: 'Diaria (agrega ~1 día por corrida)',
    sourceUrl: 'https://open-meteo.com/en/docs/historical-weather-api',
    jsonPath: './data/weather_history.json',
    csvPath: './data/weather_history.csv',
    docRepoPath: 'docs/datasets/weather_history.md',
    scripts: [
      {
        file: 'scripts/fetch_weather_history.py',
        purpose: 'Llama al endpoint archive para cada ciudad, ventana de 2 años.',
      },
    ],
  },
  {
    id: 'smn_alerts',
    name: 'SMN — Alertas meteorológicas',
    shortDescription:
      'Alertas activas del Servicio Meteorológico Nacional. Archivo vacío cuando no hay alertas.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl: 'https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=alertas',
    jsonPath: './data/smn_alerts.json',
    csvPath: './data/smn_alerts.csv',
    docRepoPath: 'docs/datasets/smn_alerts.md',
    freshnessKey: 'smn',
    scripts: [
      {
        file: 'scripts/fetch_smn_alerts.py',
        purpose: 'Descarga el ZIP del mirror open-data, parsea el TXT tab-separated.',
      },
    ],
  },
  {
    id: 'megsa',
    name: 'MEGSA — Benchmarks, USD y rondas',
    shortDescription:
      'API pública de MEGSA: Natural Gas (Henry Hub), TTF, Brent, WTI; USD/ARS; calendario de rondas de negociación. El spot doméstico sigue detrás del agent login.',
    kind: 'auto',
    frequency: 'Diaria',
    sourceUrl: 'https://www.megsa.ar/',
    jsonPath: './data/megsa.json',
    extraCsvPaths: [
      { label: 'CSV — benchmarks (HH/TTF/Brent/WTI)', path: './data/megsa_benchmarks.csv' },
      { label: 'CSV — USD/ARS', path: './data/megsa_fx.csv' },
      { label: 'CSV — rondas publicadas', path: './data/megsa_rondas.csv' },
    ],
    docRepoPath: 'docs/datasets/megsa.md',
    freshnessKey: 'megsa',
    scripts: [
      {
        file: 'scripts/fetch_megsa.py',
        purpose: 'Consulta /api/hidrocarburos, /api/dolar y /api/rondas/publicadas.',
      },
    ],
  },
  {
    id: 'daily',
    name: 'Excel base — daily.json',
    shortDescription:
      'Histórico manual mantenido en "Base Reporte Estado de Sistema.xlsx": demanda, linepack TGS/TGN, mix CAMMESA, temperaturas. En vías de reemplazo por el RDS + PPO automáticos; se conserva por la historia anterior a los fetchers.',
    kind: 'manual',
    frequency: 'Manual',
    jsonPath: './data/daily.json',
    csvPath: './data/daily.csv',
    docRepoPath: 'docs/datasets/daily.md',
    freshnessKey: 'daily',
    scripts: [
      {
        file: 'scripts/parse_base_excel.py',
        purpose:
          'Abre el XLSX con openpyxl, valida headers contra SCHEMA, extrae la hoja "Conv. valores".',
      },
      {
        file: 'scripts/ingest_incoming.py',
        purpose: 'Si se dropeó en raw/incoming/, lo detecta por magic bytes y lo rutea a raw/.',
      },
    ],
  },
  {
    id: 'linepack',
    name: 'Linepack equilibrio (Excel)',
    shortDescription:
      'Datos complementarios de equilibrio/desbalance TGN que vienen en un Excel aparte. Auxiliar al linepack total que ya trae el RDS.',
    kind: 'manual',
    frequency: 'Manual',
    jsonPath: './data/linepack.json',
    csvPath: './data/linepack.csv',
    docRepoPath: 'docs/datasets/linepack.md',
    scripts: [
      {
        file: 'scripts/parse_linepack.py',
        purpose: 'Busca cualquier *linepack*.xlsx en raw/ y extrae la primera hoja.',
      },
    ],
  },
  {
    id: 'tramos',
    name: 'Tramos — Restricciones de transporte',
    shortDescription:
      'Gas Andes (autorización export), CCO (capacidad + corte), TGS NQN (capacidad + corte). Se mantiene manual en el Excel base — no hay fuente pública con esta granularidad.',
    kind: 'manual',
    frequency: 'Manual',
    jsonPath: './data/tramos.json',
    csvPath: './data/tramos.csv',
    docRepoPath: 'docs/datasets/tramos.md',
    scripts: [
      {
        file: 'scripts/parse_base_excel.py',
        purpose: 'Función parse_tramos() lee la hoja "Datos" cols 82-86.',
      },
    ],
  },
  {
    id: 'demand_forecast',
    name: 'Forecast de demanda (14 días)',
    shortDescription:
      'Pronóstico por segmento entrenado sobre 720 días de RDS. Prioritaria usa HDD(18°C) sobre media de 10 ciudades; usinas/industria/GNC/combustible usan temp BA cruda. Total se arma con la mejor de dos opciones (suma de segmentos vs regresión directa).',
    kind: 'auto',
    frequency: 'Diaria',
    jsonPath: './data/demand_forecast.json',
    csvPath: './data/demand_forecast.csv',
    docRepoPath: 'docs/datasets/demand_forecast.md',
    scripts: [
      {
        file: 'scripts/generate_forecast.py',
        purpose:
          'Entrena regresiones lineales por segmento con offsets día-de-semana y predice 14 días.',
      },
    ],
  },
  {
    id: 'forecast_backtest',
    name: 'Backtest del forecast',
    shortDescription:
      'Evaluación rolling out-of-sample: para cada día de los últimos 60, el modelo se reentrena con los 365 días previos y se evalúa con la temperatura real. Reporta MAE/MAPE por segmento.',
    kind: 'auto',
    frequency: 'Diaria',
    jsonPath: './data/forecast_backtest.json',
    csvPath: './data/forecast_backtest.csv',
    docRepoPath: 'docs/datasets/forecast_backtest.md',
    scripts: [
      {
        file: 'scripts/backtest_forecast.py',
        purpose: 'Rolling train/predict sobre RDS, mirrorea las features de generate_forecast.',
      },
    ],
  },
  {
    id: 'comments',
    name: 'Comentarios automáticos',
    shortDescription:
      'Notas generadas automáticamente sobre el estado del día y la semana siguiente, combinando datos del daily con el forecast.',
    kind: 'auto',
    frequency: 'Diaria',
    jsonPath: './data/comments.json',
    csvPath: './data/comments.csv',
    docRepoPath: 'docs/datasets/comments.md',
    scripts: [
      {
        file: 'scripts/generate_forecast.py',
        purpose: 'Función generate_comments() arma textos con templates simples.',
      },
    ],
  },
  {
    id: 'comments_manual',
    name: 'Comentarios manuales (Excel base)',
    shortDescription:
      'Notas tipeadas por el analista en las hojas "Diario" y "Proyección Semanal" del Excel base. Se extraen todas las strings >20 chars.',
    kind: 'manual',
    frequency: 'Manual',
    jsonPath: './data/comments_manual.json',
    csvPath: './data/comments_manual.csv',
    docRepoPath: 'docs/datasets/comments_manual.md',
    scripts: [
      {
        file: 'scripts/parse_base_excel.py',
        purpose: 'Función parse_comments() itera las hojas de comentarios.',
      },
    ],
  },
  {
    id: 'drop-folder',
    name: 'raw/incoming/ — drop folder',
    shortDescription:
      'Mecanismo de ingreso manual: el usuario dropea PDFs o Excel en esta carpeta, el pipeline los detecta por magic bytes y los rutea al parser correspondiente. Copia archivada en raw/incoming/_archive con timestamp.',
    kind: 'manual',
    frequency: 'Según se droppe',
    scripts: [
      {
        file: 'scripts/ingest_incoming.py',
        purpose: 'Detecta PDF/XLSX por magic bytes y los mueve al lugar que corresponde.',
      },
    ],
  },
  {
    id: 'cammesa-diaria',
    name: 'CAMMESA — Programación diaria',
    shortDescription:
      'Descartado: el PDF público dice "Sin novedades" y no contiene datos operativos útiles. Se mantiene acá como recordatorio para no volver a scrapearlo.',
    kind: 'discarded',
    frequency: '—',
    sourceUrl: 'https://cammesaweb.cammesa.com/programacion-diaria/',
    scripts: [],
  },
]
