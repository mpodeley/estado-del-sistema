import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { DailyRow } from '../types'
import { padToDates, formatTooltipDate } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

interface CammesaWeeklyDay {
  fecha?: string
  usinas?: number | null
}

interface Props {
  data: DailyRow[]
  /** CAMMESA weekly forecast by fecha; we surface their `usinas` (gas to
   *  power) as the gas forecast for the chart. No per-fuel breakdown in
   *  CAMMESA weekly, so the other fuels stay empty in the forecast portion. */
  cammesaDays?: CammesaWeeklyDay[]
  allDates?: string[]
}

const GAS = '#3b82f6'
const GASOIL = '#f59e0b'
const FUELOIL = '#ef4444'
const CARBON = '#6b7280'

export default function FuelMixChart({ data, cammesaDays = [], allDates }: Props) {
  const cammesaByDate = new Map<string, number>()
  for (const d of cammesaDays) {
    if (d.fecha && typeof d.usinas === 'number') cammesaByDate.set(d.fecha, d.usinas)
  }

  // Historical rows with CAMMESA fuel split; latest fecha defines "today".
  const historical = data
    .filter((d) => d.cammesa_gas != null)
    .map((d) => ({
      fecha: d.fecha,
      cammesa_gas: d.cammesa_gas,
      cammesa_gasoil: d.cammesa_gasoil,
      cammesa_fueloil: d.cammesa_fueloil,
      cammesa_carbon: d.cammesa_carbon,
      cammesa_gas_est: null as number | null,
    }))
  const lastHistorical = historical[historical.length - 1]?.fecha ?? ''

  const forecastRows = [...cammesaByDate.entries()]
    .filter(([fecha]) => fecha > lastHistorical)
    .map(([fecha, usinas]) => ({
      fecha,
      cammesa_gas: null as number | null,
      cammesa_gasoil: null as number | null,
      cammesa_fueloil: null as number | null,
      cammesa_carbon: null as number | null,
      cammesa_gas_est: usinas,
    }))

  const base = [...historical, ...forecastRows].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const rows = allDates ? padToDates(base, allDates) : base

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} syncId="outlook">
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={formatTooltipDate}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {forecastRows.length > 0 && lastHistorical && (
          <ReferenceLine x={lastHistorical} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Hoy', fill: '#64748b', fontSize: 10 }} />
        )}
        <Bar dataKey="cammesa_gas" stackId="1" fill={GAS} name="Gas" isAnimationActive={false} />
        <Bar dataKey="cammesa_gasoil" stackId="1" fill={GASOIL} name="Gas Oil" isAnimationActive={false} />
        <Bar dataKey="cammesa_fueloil" stackId="1" fill={FUELOIL} name="Fuel Oil" isAnimationActive={false} />
        <Bar dataKey="cammesa_carbon" stackId="1" fill={CARBON} name="Carbón" isAnimationActive={false} />
        {/* Forecast gas bar: light fill, dashed outline, no legend entry. */}
        <Bar dataKey="cammesa_gas_est" stackId="1" fill={GAS} fillOpacity={0.2} stroke={GAS} strokeWidth={1} strokeDasharray="4 3" name="Gas est. (CAMMESA)" legendType="none" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
