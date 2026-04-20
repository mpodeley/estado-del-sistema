import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { DailyRow } from '../types'
import { padToDates } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

interface Props {
  data: DailyRow[]
  allDates?: string[]
}

export default function FuelMixChart({ data, allDates }: Props) {
  const base = data.filter((d) => d.cammesa_gas != null)
  const rows = allDates ? padToDates(base, allDates) : base
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="cammesa_gas" stackId="1" fill="#3b82f6" name="Gas" />
        <Bar dataKey="cammesa_gasoil" stackId="1" fill="#f59e0b" name="Gas Oil" />
        <Bar dataKey="cammesa_fueloil" stackId="1" fill="#ef4444" name="Fuel Oil" />
        <Bar dataKey="cammesa_carbon" stackId="1" fill="#6b7280" name="Carbon" />
      </BarChart>
    </ResponsiveContainer>
  )
}
