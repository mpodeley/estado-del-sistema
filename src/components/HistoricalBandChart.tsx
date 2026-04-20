import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { colors } from '../theme'
import { historicalBand } from '../utils/historical'

interface Props {
  rows: Array<{ fecha?: string } & Record<string, unknown>>
  field: string
  unit?: string
}

export default function HistoricalBandChart({ rows, field, unit = '' }: Props) {
  const data = historicalBand(rows as never, field as never)
  const hasBand = data.some((d) => d.min != null && d.max != null)
  if (!hasBand) {
    return <p style={{ color: colors.textDim, fontSize: 13 }}>Sin histórico suficiente todavía.</p>
  }

  // Recharts renders "Area" as the range between a single value and the baseline.
  // To get a band we use a two-component trick: plot `max` as an Area filled to
  // `min`, using an `areaDataKey` pair. Simpler: derive a "range" tuple and
  // use Recharts' stack trick — but the cleanest is to plot two series with a
  // gradient and use `fillOpacity`. Here we fake the band by plotting an
  // invisible area at min, then a filled area from min up to max, via offsets.
  const band = data.map((d) => ({
    mmdd: d.mmdd,
    // The range array [min, max] makes Recharts draw a filled band between them.
    range: d.min != null && d.max != null ? [d.min, d.max] : [null, null],
    avg: d.avg,
    current: d.current,
  }))

  const monthLabel = (mmdd: string) => (mmdd.endsWith('-01') ? mmdd.slice(0, 2) : '')

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={band}>
        <XAxis dataKey="mmdd" tickFormatter={monthLabel} tick={{ fill: '#64748b', fontSize: 11 }} interval={0} minTickGap={20} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit={unit ? ` ${unit}` : ''} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={(mmdd: string) => `Día ${mmdd}`}
          formatter={(v: number | number[], name: string) => {
            if (Array.isArray(v)) {
              return [`${v[0]?.toFixed(1)} – ${v[1]?.toFixed(1)} ${unit}`.trim(), 'Rango histórico']
            }
            return v != null ? [`${v.toFixed(1)} ${unit}`.trim(), name] : ['-', name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="range"
          name="Rango histórico"
          fill={colors.textDim}
          fillOpacity={0.2}
          stroke="none"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="avg"
          name="Promedio histórico"
          stroke={colors.textMuted}
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="current"
          name="Año actual"
          stroke={colors.accent.blue}
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
