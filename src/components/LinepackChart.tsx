import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Legend } from 'recharts'
import type { DailyRow, ETGSRow } from '../types'
import type { TGNSystemStateRow } from '../hooks/useData'
import { padToDates, formatTooltipDate, weekendSpans } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

const TGS = '#10b981'
const TGN = '#3b82f6'

function firstValid<K extends keyof DailyRow>(data: DailyRow[], key: K): number | null {
  for (const row of data) {
    const v = row[key]
    if (typeof v === 'number') return v
  }
  return null
}

// '125617220' -> 125.62. Raw m³ to MMm³, matches Excel-base scale.
function toMMm3(raw: string | undefined | null): number | null {
  if (!raw) return null
  const n = Number(String(raw).replace(/[^\d.-]/g, ''))
  if (isNaN(n)) return null
  return n / 1_000_000
}

interface Props {
  data: DailyRow[]
  /** ETGS daily reports fed by email-ingest — provides TGS linepack
   *  for days where the Excel base hasn't been refreshed yet. */
  etgsRows?: ETGSRow[]
  /** TGN ABII scrape — provides 'Actual' (m³) which is the TGN
   *  linepack stock. */
  tgnRows?: TGNSystemStateRow[]
  allDates?: string[]
}

export default function LinepackChart({ data, etgsRows = [], tgnRows = [], allDates }: Props) {
  // Each system has its own operating band; we plot both on the same Y axis
  // so they can be compared but never sum them (they are independent systems).
  const limInfTgs = firstValid(data, 'lim_inf_tgs')
  const limSupTgs = firstValid(data, 'lim_sup_tgs')
  const limInfTgn = firstValid(data, 'lim_inf_tgn')
  const limSupTgn = firstValid(data, 'lim_sup_tgn')

  // Build lookup tables from the secondary sources, then fall back to
  // them on dates where the Excel base is blank.
  const tgsByDate = new Map<string, number>()
  for (const r of etgsRows) {
    if (r.fecha && typeof r.linepack_tgs_dia_actual === 'number') {
      tgsByDate.set(r.fecha, r.linepack_tgs_dia_actual)
    }
  }
  const tgnByDate = new Map<string, number>()
  for (const r of tgnRows) {
    const f = r.fecha
    const v = toMMm3(r['Actual'])
    if (f && v != null) tgnByDate.set(f, v)
  }

  // Union of fechas from the Excel base + the overlays — otherwise
  // dates that only exist in ETGS/TGN never make it onto the chart.
  const fechaSet = new Set<string>()
  for (const d of data) if (d.fecha) fechaSet.add(d.fecha)
  for (const f of tgsByDate.keys()) fechaSet.add(f)
  for (const f of tgnByDate.keys()) fechaSet.add(f)
  const allFechas = Array.from(fechaSet).sort()
  const dailyByDate = new Map<string, DailyRow>()
  for (const d of data) dailyByDate.set(d.fecha, d)

  const base = allFechas.map((fecha) => {
    const dr = dailyByDate.get(fecha)
    return {
      fecha,
      tgs: (typeof dr?.linepack_tgs === 'number' ? dr.linepack_tgs : tgsByDate.get(fecha)) ?? null,
      tgn: (typeof dr?.linepack_tgn === 'number' ? dr.linepack_tgn : tgnByDate.get(fecha)) ?? null,
    }
  })
  const rows = allDates ? padToDates(base, allDates) : base
  const weekends = weekendSpans(rows.map((r) => r.fecha))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} syncId="outlook">
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={formatTooltipDate}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {weekends.map(([s, e], i) => (
          <ReferenceArea key={`wk-${i}`} x1={s} x2={e} fill="#64748b" fillOpacity={0.08} strokeOpacity={0} ifOverflow="extendDomain" />
        ))}

        {limInfTgs != null && (
          <ReferenceLine y={limInfTgs} stroke={TGS} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: `TGS min ${limInfTgs}`, fill: TGS, fontSize: 10, position: 'insideBottomLeft' }} />
        )}
        {limSupTgs != null && (
          <ReferenceLine y={limSupTgs} stroke={TGS} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: `TGS max ${limSupTgs}`, fill: TGS, fontSize: 10, position: 'insideTopLeft' }} />
        )}
        {limInfTgn != null && (
          <ReferenceLine y={limInfTgn} stroke={TGN} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: `TGN min ${limInfTgn}`, fill: TGN, fontSize: 10, position: 'insideBottomLeft' }} />
        )}
        {limSupTgn != null && (
          <ReferenceLine y={limSupTgn} stroke={TGN} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: `TGN max ${limSupTgn}`, fill: TGN, fontSize: 10, position: 'insideTopLeft' }} />
        )}

        <Line type="monotone" dataKey="tgs" stroke={TGS} strokeWidth={2} dot={false} name="TGS" connectNulls />
        <Line type="monotone" dataKey="tgn" stroke={TGN} strokeWidth={2} dot={false} name="TGN" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
