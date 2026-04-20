import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import type { DailyRow } from '../types'
import { padToDates, formatTooltipDate } from '../utils/charts'

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

interface Props {
  data: DailyRow[]
  allDates?: string[]
}

export default function LinepackChart({ data, allDates }: Props) {
  // Each system has its own operating band; we plot both on the same Y axis
  // so they can be compared but never sum them (they are independent systems).
  const limInfTgs = firstValid(data, 'lim_inf_tgs')
  const limSupTgs = firstValid(data, 'lim_sup_tgs')
  const limInfTgn = firstValid(data, 'lim_inf_tgn')
  const limSupTgn = firstValid(data, 'lim_sup_tgn')

  const base = data.map((d) => ({
    fecha: d.fecha,
    tgs: d.linepack_tgs,
    tgn: d.linepack_tgn,
  }))
  const rows = allDates ? padToDates(base, allDates) : base

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
