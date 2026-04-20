import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import type { DailyRow } from '../types'
import { padToDates } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

function firstValid<K extends keyof DailyRow>(data: DailyRow[], key: K): number | null {
  for (const row of data) {
    const v = row[key]
    if (typeof v === 'number') return v
  }
  return null
}

interface Props {
  data: DailyRow[]
  allDates?: string[]
}

export default function LinepackChart({ data, allDates }: Props) {
  const limInfTgs = firstValid(data, 'lim_inf_tgs')
  const limSupTgs = firstValid(data, 'lim_sup_tgs')
  const limInfTgn = firstValid(data, 'lim_inf_tgn')
  const limSupTgn = firstValid(data, 'lim_sup_tgn')

  const base = data.map((d) => ({
    fecha: d.fecha,
    tgs: d.linepack_tgs,
    tgn: d.linepack_tgn,
    total: d.linepack_total,
  }))
  const rows = allDates ? padToDates(base, allDates) : base

  const totalMin = limInfTgs != null && limInfTgn != null ? limInfTgs + limInfTgn : null
  const totalMax = limSupTgs != null && limSupTgn != null ? limSupTgs + limSupTgn : null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {totalMin != null && (
          <ReferenceLine y={totalMin} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Min', fill: '#ef4444', fontSize: 10 }} />
        )}
        {totalMax != null && (
          <ReferenceLine y={totalMax} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Max', fill: '#22c55e', fontSize: 10 }} />
        )}
        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" connectNulls />
        <Line type="monotone" dataKey="tgs" stroke="#10b981" strokeWidth={1.5} dot={false} name="TGS" connectNulls />
        <Line type="monotone" dataKey="tgn" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="TGN" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
