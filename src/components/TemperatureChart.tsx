import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DailyRow } from '../types'

const fmt = (d: string) => d.slice(5)

export default function TemperatureChart({ data }: { data: DailyRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="°" />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v: number) => `${v}°C`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="temp_max_ba" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Max BA" />
        <Line type="monotone" dataKey="temp_prom_ba" stroke="#f59e0b" strokeWidth={2} dot={false} name="Prom BA" />
        <Line type="monotone" dataKey="temp_min_ba" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Min BA" />
      </LineChart>
    </ResponsiveContainer>
  )
}
