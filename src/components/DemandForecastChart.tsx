import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { DailyRow } from '../types'
import type { DemandForecastDay } from '../hooks/useData'

const fmt = (d: string) => d.slice(5)

interface Props {
  data: DailyRow[]
  forecast: DemandForecastDay[]
}

export default function DemandForecastChart({ data, forecast }: Props) {
  const historical = data.map(d => ({
    fecha: d.fecha,
    prioritaria_real: d.prioritaria,
    demanda_real: d.demanda_total,
    prioritaria_est: null as number | null,
    demanda_est: null as number | null,
  }))

  const lastDate = data[data.length - 1]?.fecha ?? ''
  const fcData = forecast
    .filter(f => f.fecha > lastDate)
    .map(f => ({
      fecha: f.fecha,
      prioritaria_real: null as number | null,
      demanda_real: null as number | null,
      prioritaria_est: f.prioritaria_est,
      demanda_est: f.demanda_total_est,
    }))

  const merged = [...historical, ...fcData]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v: number, name: string) => v != null ? [`${v.toFixed(1)} MMm3/d`, name] : ['-', name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {fcData.length > 0 && (
          <ReferenceLine x={lastDate} stroke="#64748b" strokeDasharray="3 3"
            label={{ value: 'Hoy', fill: '#64748b', fontSize: 10 }} />
        )}
        <Line type="monotone" dataKey="demanda_real" stroke="#3b82f6" strokeWidth={2} dot={false} name="Demanda total (real)" />
        <Line type="monotone" dataKey="prioritaria_real" stroke="#10b981" strokeWidth={2} dot={false} name="Prioritaria (real)" />
        <Line type="monotone" dataKey="demanda_est" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Demanda total (est.)" />
        <Line type="monotone" dataKey="prioritaria_est" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prioritaria (est.)" />
      </LineChart>
    </ResponsiveContainer>
  )
}
