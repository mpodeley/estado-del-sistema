import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { DailyRow } from '../types'
import type { ForecastDay } from '../hooks/useData'

const fmt = (d: string) => d.slice(5)

interface Props {
  data: DailyRow[]
  forecast?: ForecastDay[]
}

export default function TemperatureChart({ data, forecast = [] }: Props) {
  // Merge historical + forecast into one series
  const historical = data.map(d => ({
    fecha: d.fecha,
    temp_max_real: d.temp_max_ba,
    temp_prom_real: d.temp_prom_ba,
    temp_min_real: d.temp_min_ba,
    temp_max_fc: null as number | null,
    temp_prom_fc: null as number | null,
    temp_min_fc: null as number | null,
  }))

  const lastDate = data[data.length - 1]?.fecha ?? ''
  const fcData = forecast
    .filter(f => f.fecha > lastDate)
    .map(f => ({
      fecha: f.fecha,
      temp_max_real: null as number | null,
      temp_prom_real: null as number | null,
      temp_min_real: null as number | null,
      temp_max_fc: f.temp_max,
      temp_prom_fc: f.temp_prom,
      temp_min_fc: f.temp_min,
    }))

  const merged = [...historical, ...fcData]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="°" />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v: number) => v != null ? `${v}°C` : '-'}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {fcData.length > 0 && (
          <ReferenceLine x={lastDate} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Hoy', fill: '#64748b', fontSize: 10 }} />
        )}
        <Line type="monotone" dataKey="temp_max_real" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Max real" />
        <Line type="monotone" dataKey="temp_prom_real" stroke="#f59e0b" strokeWidth={2} dot={false} name="Prom real" />
        <Line type="monotone" dataKey="temp_min_real" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Min real" />
        <Line type="monotone" dataKey="temp_max_fc" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Max forecast" connectNulls={false} />
        <Line type="monotone" dataKey="temp_prom_fc" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prom forecast" connectNulls={false} />
        <Line type="monotone" dataKey="temp_min_fc" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Min forecast" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
