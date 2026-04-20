import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { DailyRow, DemandForecastDay } from '../types'
import { padToDates, formatTooltipDate } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

interface CammesaWeeklyDay {
  fecha?: string
  usinas?: number | null
  prioritaria?: number | null
  industria?: number | null
}

interface Props {
  data: DailyRow[]
  forecast?: DemandForecastDay[]
  /** CAMMESA's own forecast by date (from PS_ weekly). When present, its
   *  usinas value overrides our regression — CAMMESA knows dispatch plans
   *  better than temperature-based modeling. */
  cammesaDays?: CammesaWeeklyDay[]
  allDates?: string[]
  yDomain?: [number, number]
}

export default function DemandChart({ data, forecast = [], cammesaDays = [], allDates, yDomain }: Props) {
  // Map CAMMESA-provided usinas forecast by fecha for fast lookup.
  const cammesaUsinasByDate = new Map<string, number>()
  for (const d of cammesaDays) {
    if (d.fecha && typeof d.usinas === 'number') cammesaUsinasByDate.set(d.fecha, d.usinas)
  }

  // Historical stacked area: values from the Excel-backed DailyRow.
  const historical = data.map((d) => ({
    fecha: d.fecha,
    prioritaria: d.prioritaria,
    industria: d.industria,
    usinas: d.usinas,
    exportaciones: d.exportaciones,
  }))
  const lastHistorical = historical[historical.length - 1]?.fecha ?? ''

  // Forecast continuation: same stack, dashed/lighter. We output the forecast
  // under the same data keys so the stack continues seamlessly; a "Hoy"
  // reference line communicates where history ends.
  const forecastRows = forecast
    .filter((f) => f.fecha > lastHistorical)
    .map((f) => ({
      fecha: f.fecha,
      prioritaria: f.prioritaria_est,
      industria: (f as DemandForecastDay & { industria_est?: number | null }).industria_est ?? null,
      // Prefer CAMMESA's own usinas forecast when available for this fecha.
      usinas: cammesaUsinasByDate.get(f.fecha) ?? f.usinas_est,
      exportaciones: null,
    }))

  const base = [...historical, ...forecastRows]
  const rows = allDates ? padToDates(base, allDates) : base

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={rows} syncId="outlook">
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={yDomain ?? ['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={formatTooltipDate}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {forecastRows.length > 0 && lastHistorical && (
          <ReferenceLine x={lastHistorical} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Hoy', fill: '#64748b', fontSize: 10 }} />
        )}
        <Area type="monotone" dataKey="prioritaria" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Prioritaria" isAnimationActive={false} />
        <Area type="monotone" dataKey="industria" stackId="1" fill="#10b981" stroke="#10b981" name="Industria" isAnimationActive={false} />
        <Area type="monotone" dataKey="usinas" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="Usinas" isAnimationActive={false} />
        <Area type="monotone" dataKey="exportaciones" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" name="Exportaciones" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
