import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { colors } from '../theme'
import { formatTooltipDate, padToDates } from '../utils/charts'

interface Importacion {
  programa?: number | null
  proximo_barco?: string | null
}

interface Consumo {
  programa?: number | null
}

interface Exportacion {
  vol_exportar?: number | null
}

interface RDSRow {
  fecha?: string
  linepack_delta?: number | null
  consumo_total_estimado?: number | null
  importaciones?: Record<string, Importacion>
  consumos?: Record<string, Consumo>
  exportaciones?: Record<string, Exportacion>
}

interface Props {
  rows: RDSRow[]
  /** Calendar of fechas to render; other charts get this from the global scale
   *  selector so everything stays in sync. */
  allDates?: string[]
}

/**
 * "Balance" view in the gas-trading-desk style: for each day, stack the
 * supply sources (imports from the RDS + implied local production) against
 * the demand total, with observed linepack delta overlaid as a line.
 *
 * Local production is not published in the RDS, so we back it out from the
 * flow-balance identity:
 *    local = consumo_total + exports + delta_linepack - imports_total
 * When the RDS numbers are consistent, this matches domestic production;
 * when it's off, you see the residual as noise.
 */
export default function SupplyDemandBalance({ rows, allDates }: Props) {
  const data = useMemo(() => {
    const computed = rows
      .filter((r): r is RDSRow & { fecha: string } => typeof r.fecha === 'string')
      .map((r) => {
        const imps = r.importaciones ?? {}
        const bolivia = imps.bolivia?.programa ?? 0
        const escobar = imps.escobar?.programa ?? 0
        const bahia = imps.bahia_blanca?.programa ?? 0
        const importsTotal = bolivia + escobar + bahia

        const exps = r.exportaciones ?? {}
        const exportsTotal = (exps.tgn?.vol_exportar ?? 0) + (exps.tgs?.vol_exportar ?? 0)

        const demand = r.consumo_total_estimado ?? 0
        const deltaLP = r.linepack_delta ?? 0

        // Derived local production from the flow-balance identity.
        const localDerived = Math.max(0, demand + exportsTotal + deltaLP - importsTotal)

        return {
          fecha: r.fecha,
          bolivia,
          escobar,
          bahia,
          local: localDerived,
          demand: -demand, // negative so supply and demand face off
          deltaLP,
        }
      })

    return allDates ? padToDates(computed, allDates) : computed
  }, [rows, allDates])

  if (data.length === 0) {
    return <p style={{ color: colors.textDim, fontSize: 13 }}>Sin datos en el período.</p>
  }

  const fmt = (d: string) => d.slice(5)

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} syncId="outlook">
        <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" minTickGap={30} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" MMm³/d" />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={formatTooltipDate}
          formatter={(v: number, name: string) => (v != null ? [`${Math.abs(v).toFixed(1)} MMm³/d`, name] : ['-', name])}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="#475569" />
        <Bar dataKey="local" stackId="supply" fill={colors.accent.green} name="Producción local (derivada)" isAnimationActive={false} />
        <Bar dataKey="bolivia" stackId="supply" fill={colors.accent.red} name="Bolivia" isAnimationActive={false} />
        <Bar dataKey="escobar" stackId="supply" fill={colors.accent.orange} name="GNL Escobar" isAnimationActive={false} />
        <Bar dataKey="bahia" stackId="supply" fill={colors.accent.purple} name="GNL Bahía Blanca" isAnimationActive={false} />
        <Bar dataKey="demand" stackId="demand" fill={colors.accent.blue} name="Demanda total" isAnimationActive={false} />
        <Line type="monotone" dataKey="deltaLP" stroke={colors.textPrimary} strokeWidth={1.5} dot={false} name="Δ Linepack observado" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
