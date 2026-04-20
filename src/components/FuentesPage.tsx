import { badge, card, colors, space } from '../theme'
import {
  useDaily,
  useWeather,
  useWeatherRegions,
  useEnargasRDS,
  useCammesaWeekly,
  useSMNAlerts,
} from '../hooks/useData'

type Kind = 'auto' | 'manual' | 'blocked' | 'discarded'

interface Meta {
  generated_at: string | null
}

interface Source {
  id: string
  name: string
  url?: string
  kind: Kind
  note: string
  freq: string
  meta?: Meta
}

function ago(iso: string | null): string {
  if (!iso) return 'sin dato'
  const ms = Date.now() - new Date(iso).getTime()
  if (isNaN(ms)) return iso
  const h = ms / 3_600_000
  if (h < 1) return `hace ${Math.round(h * 60)} min`
  if (h < 48) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} d`
}

function kindBadge(k: Kind): React.CSSProperties {
  const colorMap: Record<Kind, string> = {
    auto: colors.status.ok,
    manual: colors.status.warn,
    blocked: colors.status.err,
    discarded: colors.textDim,
  }
  return badge(colorMap[k])
}

function kindLabel(k: Kind): string {
  return { auto: 'AUTO', manual: 'MANUAL', blocked: 'BLOQUEADO', discarded: 'DESCARTADO' }[k]
}

export default function FuentesPage() {
  const daily = useDaily()
  const weather = useWeather()
  const regions = useWeatherRegions()
  const rds = useEnargasRDS()
  const cammesaWeekly = useCammesaWeekly()
  const smn = useSMNAlerts()

  const sources: Source[] = [
    {
      id: 'enargas-rds',
      name: 'ENARGAS — Reporte Diario del Sistema (RDS)',
      url: 'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-reporte-diario-sistema.php',
      kind: 'auto',
      freq: 'Diaria',
      note: 'Line pack, importaciones, exportaciones, consumos por segmento, temperatura BA + forecast 6 días. Backfill 2 años completado.',
      meta: rds.meta,
    },
    {
      id: 'open-meteo-forecast',
      name: 'Open-Meteo — forecast 14 días',
      url: 'https://open-meteo.com/',
      kind: 'auto',
      freq: 'Continua',
      note: 'BA individual (weather.json).',
      meta: weather.meta,
    },
    {
      id: 'open-meteo-regions',
      name: 'Open-Meteo — 10 ciudades',
      url: 'https://open-meteo.com/',
      kind: 'auto',
      freq: 'Continua',
      note: 'BA, Rosario, Córdoba, Santa Fe, Mendoza, Neuquén, Bahía Blanca, Esquel, Salta, Tucumán.',
      meta: regions.meta,
    },
    {
      id: 'open-meteo-archive',
      name: 'Open-Meteo — histórico 2 años',
      url: 'https://open-meteo.com/en/docs/historical-weather-api',
      kind: 'auto',
      freq: 'One-shot',
      note: '7310 filas en weather_history.json. Se refresca manualmente con fetch_weather_history.py.',
    },
    {
      id: 'cammesa-weekly',
      name: 'CAMMESA — Programación semanal (PS_)',
      url: 'https://cammesaweb.cammesa.com/programacion-semanal/',
      kind: 'auto',
      freq: 'Semanal',
      note: 'PDF con forecast 7 días: demanda por sector + temperatura + inyecciones + stock.',
      meta: cammesaWeekly.meta,
    },
    {
      id: 'smn-alertas',
      name: 'SMN — alertas meteorológicas',
      url: 'https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=alertas',
      kind: 'auto',
      freq: 'Continua',
      note: 'Endpoint open-data (TXT dentro de ZIP). www.smn.gob.ar/alertas está detrás de Cloudflare; este mirror es directo.',
      meta: smn.meta,
    },
    {
      id: 'excel-base',
      name: 'Excel base — daily.json',
      kind: 'manual',
      freq: 'Manual',
      note: 'Base Reporte Estado de Sistema.xlsx. Se procesa via parser header-driven. El RDS ya cubre buena parte de su info → en vías de reemplazo.',
      meta: daily.meta,
    },
    {
      id: 'linepack-excel',
      name: 'Linepack equilibrio (Excel)',
      kind: 'manual',
      freq: 'Manual',
      note: 'gasoductoLinepackEq.xlsx. Info complementaria de equilibrio/desbalance TGN.',
    },
    {
      id: 'drop-folder',
      name: 'raw/incoming/ — drop folder',
      kind: 'manual',
      freq: 'Según se droppe',
      note: 'Usuario dropea PDFs/Excel, el pipeline los detecta por magic bytes y rutea al parser. Archivo ingerido se copia a raw/incoming/_archive con timestamp.',
    },
    {
      id: 'cammesa-resultados',
      name: 'CAMMESA — Resultados de operaciones',
      url: 'https://cammesaweb.cammesa.com/reportes-resultados-de-operaciones/',
      kind: 'blocked',
      freq: 'Diaria (cierre)',
      note: 'Requiere login de agente. Alternativa: dropear PDFs manualmente en raw/incoming/.',
    },
    {
      id: 'cammesa-diaria',
      name: 'CAMMESA — Programación diaria',
      url: 'https://cammesaweb.cammesa.com/programacion-diaria/',
      kind: 'discarded',
      freq: 'Diaria',
      note: 'Descartado: el PDF público dice "Sin novedades" — no contiene data operativa útil.',
    },
    {
      id: 'megsa',
      name: 'MEGSA — precios spot',
      url: 'https://www.megsa.com.ar/',
      kind: 'blocked',
      freq: 'Diaria',
      note: 'Pendiente de investigar. Sería útil para contexto comercial.',
    },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: `${space.xl}px ${space.lg}px` }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
        Fuentes de datos
      </h2>
      <p style={{ color: colors.textDim, fontSize: 14, marginBottom: space.xl }}>
        Estado actual de cada fuente que alimenta el tablero, con última actualización donde aplica.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
        {sources.map((s) => {
          const freshness = s.meta ? ago(s.meta.generated_at) : '—'
          return (
            <div key={s.id} style={{ ...card, padding: `${space.md}px ${space.xl}px` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h4 style={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>{s.name}</h4>
                  <span style={kindBadge(s.kind)}>{kindLabel(s.kind)}</span>
                </div>
                <div style={{ display: 'flex', gap: space.md, alignItems: 'center' }}>
                  <span style={{ color: colors.textDim, fontSize: 12 }}>{s.freq}</span>
                  <span style={{ color: colors.textMuted, fontSize: 12 }}>
                    {s.meta ? `Última actualización: ${freshness}` : ''}
                  </span>
                </div>
              </div>
              <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>{s.note}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener" style={{ color: colors.accent.blue, fontSize: 12, wordBreak: 'break-all' }}>
                  {s.url}
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
