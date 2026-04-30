import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { colors } from '../theme'
import { formatTooltipDate } from '../utils/charts'

interface Importacion {
  programa?: number | null
  proximo_barco?: string | null
}

interface RDSRow {
  fecha?: string
  importaciones?: {
    escobar?: Importacion
    bahia_blanca?: Importacion
  }
}

interface Props {
  rows: RDSRow[]
}

/**
 * Regasification volume per LNG port over time. During winter (may-aug) the
 * RDS reports non-zero "programa" values for Escobar and Bahía Blanca when
 * LNG cargoes are being regasified. Off-season the values are zero, in which
 * case we show the placeholder rather than a chart of historical winter peaks
 * which would be misleading next to the rest of the operational view.
 */
export default function LNGArrivalsChart({ rows }: Props) {
  const sorted = rows
    .filter((r): r is RDSRow & { fecha: string } => typeof r.fecha === 'string')
    .map((r) => ({
      fecha: r.fecha,
      escobar: r.importaciones?.escobar?.programa ?? null,
      bahia_blanca: r.importaciones?.bahia_blanca?.programa ?? null,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Render only the last 60 days, matching the operational horizon. Showing
  // the entire 2-year history alongside 7d charts confused dispatch readers.
  const data = sorted.slice(-60)
  const recent = sorted.slice(-14)
  const hasRecentActivity = recent.some((r) => (r.escobar ?? 0) > 0 || (r.bahia_blanca ?? 0) > 0)
  if (!hasRecentActivity) {
    const nonZero = sorted.filter((r) => (r.escobar ?? 0) > 0 || (r.bahia_blanca ?? 0) > 0)
    const lastNonZero = nonZero.length > 0 ? nonZero[nonZero.length - 1] : null
    return (
      <p style={{ color: colors.textDim, fontSize: 13 }}>
        Sin regasificación activa en los últimos 14 días.{' '}
        {lastNonZero
          ? `Último cargamento programado: ${lastNonZero.fecha}.`
          : ''}{' '}
        Los puertos GNL Escobar y GNL Bahía Blanca operan típicamente entre mayo y agosto.
      </p>
    )
  }

  const fmt = (d: string) => d.slice(5)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} syncId="outlook">
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" minTickGap={30} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" MMm³/d" />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={formatTooltipDate}
          formatter={(v: number, name: string) => (v != null ? [`${v.toFixed(1)} MMm³/d`, name] : ['-', name])}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="escobar" stroke={colors.accent.orange} strokeWidth={2} dot={false} name="GNL Escobar" connectNulls={false} />
        <Line type="monotone" dataKey="bahia_blanca" stroke={colors.accent.purple} strokeWidth={2} dot={false} name="GNL Bahía Blanca" connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
