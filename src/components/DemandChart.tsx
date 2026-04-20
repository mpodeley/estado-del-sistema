import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DailyRow } from '../types'
import { padToDates, formatTooltipDate } from '../utils/charts'

const fmt = (d: string) => d.slice(5) // MM-DD

interface Props {
  data: DailyRow[]
  allDates?: string[]
  yDomain?: [number, number]
}

export default function DemandChart({ data, allDates, yDomain }: Props) {
  const rows = allDates ? padToDates(data, allDates) : data
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
        <Area type="monotone" dataKey="prioritaria" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Prioritaria" />
        <Area type="monotone" dataKey="industria" stackId="1" fill="#10b981" stroke="#10b981" name="Industria" />
        <Area type="monotone" dataKey="usinas" stackId="1" fill="#f59e0b" stroke="#f59e0b" name="Usinas" />
        <Area type="monotone" dataKey="exportaciones" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" name="Exportaciones" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
