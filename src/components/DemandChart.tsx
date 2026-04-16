import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DailyRow } from '../types'

const fmt = (d: string) => d.slice(5) // MM-DD

export default function DemandChart({ data }: { data: DailyRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="prioritaria" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Prioritaria" />
        <Area type="monotone" dataKey="industria" stackId="1" fill="#10b981" stroke="#10b981" name="Industria" />
        <Area type="monotone" dataKey="usinas" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="Usinas" />
        <Area type="monotone" dataKey="exportaciones" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" name="Exportaciones" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
