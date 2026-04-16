import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import type { DailyRow } from '../types'

const fmt = (d: string) => d.slice(5)

export default function LinepackChart({ data }: { data: DailyRow[] }) {
  const limInfTgs = data.find(d => d.lim_inf_tgs)?.lim_inf_tgs ?? 215
  const limSupTgs = data.find(d => d.lim_sup_tgs)?.lim_sup_tgs ?? 235
  const limInfTgn = data.find(d => d.lim_inf_tgn)?.lim_inf_tgn ?? 110
  const limSupTgn = data.find(d => d.lim_sup_tgn)?.lim_sup_tgn ?? 142

  // Combine into total view
  const chartData = data.map(d => ({
    fecha: d.fecha,
    tgs: d.linepack_tgs,
    tgn: d.linepack_tgn,
    total: d.linepack_total,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={limInfTgs + limInfTgn} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Min', fill: '#ef4444', fontSize: 10 }} />
        <ReferenceLine y={limSupTgs + limSupTgn} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Max', fill: '#22c55e', fontSize: 10 }} />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
        <Line type="monotone" dataKey="tgs" stroke="#10b981" strokeWidth={1.5} dot={false} name="TGS" />
        <Line type="monotone" dataKey="tgn" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="TGN" />
      </LineChart>
    </ResponsiveContainer>
  )
}
