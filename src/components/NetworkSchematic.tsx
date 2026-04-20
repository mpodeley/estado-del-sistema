import { useMemo, useState } from 'react'
import { colors, sectionTitle, space } from '../theme'
import { EDGES, NODES, VIEWBOX, utilizationColor } from '../data/network'
import type { NetworkEdge } from '../data/network'
import type { TramoRow, GasoductoRow } from '../hooks/useData'

interface Props {
  tramos: TramoRow[]
  gasoductoMonthly: GasoductoRow[]
}

type TramoLookup = {
  cco?: { cap: number | null; corte: number | null; fecha: string }
  tgs_nqn?: { cap: number | null; corte: number | null; fecha: string }
  gas_andes?: { cap: number | null; corte: number | null; fecha: string }
}

function latestTramo(rows: TramoRow[]): TramoLookup {
  const r = rows[rows.length - 1]
  if (!r) return {}
  return {
    cco: { cap: r.cco_capacidad, corte: r.cco_corte, fecha: r.fecha },
    tgs_nqn: { cap: r.tgs_nqn_capacidad, corte: r.tgs_nqn_corte, fecha: r.fecha },
    gas_andes: { cap: r.gas_andes_autorizacion, corte: 0, fecha: r.fecha },
  }
}

function utilization(cap: number | null | undefined, corte: number | null | undefined): number | null {
  if (cap == null || cap === 0) return null
  const used = cap + (corte ?? 0)
  return Math.max(0, used / cap)
}

export default function NetworkSchematic({ tramos, gasoductoMonthly }: Props) {
  const [hover, setHover] = useState<NetworkEdge | null>(null)
  const tramoLookup = useMemo(() => latestTramo(tramos), [tramos])
  const latestFlow = gasoductoMonthly[gasoductoMonthly.length - 1]

  // Normalize stroke width by latest monthly flow across edges we have it for.
  const flowValues = latestFlow
    ? EDGES.map((e) => (e.flowKey ? (latestFlow[e.flowKey] ?? 0) / 1000 : 0))
    : []
  const maxFlow = Math.max(1, ...flowValues)

  const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]))

  return (
    <div>
      <h3 style={sectionTitle}>
        Red de transporte — esquema
        <span style={{ float: 'right', fontSize: 11, color: colors.textDim, textTransform: 'none', fontWeight: 400 }}>
          Líneas coloreadas por stress (último tramo reportado); grosor por flujo mensual
        </span>
      </h3>
      <div style={{ position: 'relative', width: '100%', maxWidth: VIEWBOX.width, margin: '0 auto' }}>
        <svg
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          style={{ width: '100%', height: 'auto', background: colors.surfaceAlt, borderRadius: 8 }}
        >
          {/* Edges first so nodes sit on top. */}
          {EDGES.map((e) => {
            const from = nodeById[e.fromId]
            const to = nodeById[e.toId]
            if (!from || !to) return null

            const flowMMm3 = e.flowKey && latestFlow ? (latestFlow[e.flowKey] ?? 0) / 1000 : 0
            const strokeWidth = 1.5 + (flowMMm3 / maxFlow) * 10

            let util: number | null = null
            let color = '#4b648b'
            if (e.tramosKey && tramoLookup[e.tramosKey]) {
              const t = tramoLookup[e.tramosKey]
              util = utilization(t?.cap, t?.corte)
              color = utilizationColor(util)
            } else {
              color = '#64748b'
            }

            return (
              <g
                key={e.id}
                onMouseEnter={() => setHover(e)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'default' }}
              >
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={color}
                  strokeWidth={hover?.id === e.id ? strokeWidth + 2 : strokeWidth}
                  strokeOpacity={hover && hover.id !== e.id ? 0.25 : 0.9}
                />
                {/* Invisible fat stroke for easier hover. */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="transparent"
                  strokeWidth={14}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {NODES.map((n) => {
            const isSupply = n.role === 'supply'
            const isExport = n.role === 'export'
            const fill = isSupply ? colors.accent.green : isExport ? colors.accent.purple : colors.accent.blue
            return (
              <g key={n.id}>
                <circle cx={n.x} cy={n.y} r={10} fill={fill} fillOpacity={0.85} stroke={colors.surface} strokeWidth={2} />
                <text
                  x={isSupply ? n.x + 18 : n.x - 18}
                  y={n.y + 4}
                  textAnchor={isSupply ? 'start' : 'end'}
                  fill={colors.textPrimary}
                  fontSize={12}
                  fontWeight={600}
                >
                  {n.label}
                </text>
                {n.note && (
                  <text
                    x={isSupply ? n.x + 18 : n.x - 18}
                    y={n.y + 18}
                    textAnchor={isSupply ? 'start' : 'end'}
                    fill={colors.textDim}
                    fontSize={10}
                  >
                    {n.note}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Hover panel */}
        {hover && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(15,23,42,0.95)',
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: `${space.sm}px ${space.md}px`,
              minWidth: 220,
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            <div style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: 4 }}>
              {hover.label}
            </div>
            <div style={{ color: colors.textDim, fontSize: 11, marginBottom: 6 }}>
              {hover.operator} · {nodeById[hover.fromId]?.label} → {nodeById[hover.toId]?.label}
            </div>
            {hover.tramosKey && tramoLookup[hover.tramosKey] && (
              <>
                <Kv label="Capacidad" value={`${tramoLookup[hover.tramosKey]?.cap?.toFixed(1) ?? '—'} MMm³/d`} />
                {hover.tramosKey !== 'gas_andes' && (
                  <Kv label="Corte" value={`${tramoLookup[hover.tramosKey]?.corte?.toFixed(1) ?? '—'} MMm³/d`} />
                )}
                <Kv
                  label="Utilización"
                  value={
                    utilization(tramoLookup[hover.tramosKey]?.cap, tramoLookup[hover.tramosKey]?.corte) != null
                      ? `${(utilization(tramoLookup[hover.tramosKey]?.cap, tramoLookup[hover.tramosKey]?.corte)! * 100).toFixed(0)}%`
                      : '—'
                  }
                />
              </>
            )}
            {hover.flowKey && latestFlow && (
              <Kv
                label="Flujo mensual"
                value={`${((latestFlow[hover.flowKey] ?? 0) / 1000).toFixed(0)} MMm³/mes`}
              />
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ marginTop: space.sm, display: 'flex', gap: space.md, flexWrap: 'wrap', fontSize: 11, color: colors.textDim }}>
        <LegendPill color="#53e0a1" label="< 50% util" />
        <LegendPill color="#ffe06d" label="50–80%" />
        <LegendPill color="#ff9d4d" label="80–100%" />
        <LegendPill color="#ff5f87" label="saturado" />
        <LegendPill color="#64748b" label="sin dato de stress" />
      </div>
      <p style={{ color: colors.textDim, fontSize: 11, marginTop: space.sm }}>
        Capacidad/corte disponibles solo para CCO (Centro Oeste), TGS NQN (Neuba) y Gas Andes —
        datos del Excel base. Otras líneas muestran flujo relativo (grosor) pero no stress absoluto
        hasta que sumemos fuentes operativas por tramo.
      </p>
    </div>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '2px 0' }}>
      <span style={{ color: colors.textDim }}>{label}</span>
      <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
      {label}
    </span>
  )
}
