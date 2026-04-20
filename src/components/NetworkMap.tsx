import { useMemo, useState } from 'react'
import { colors, sectionTitle, space } from '../theme'
import type { GasNetwork, GasRoute, CountryOutline, TramoRow } from '../hooks/useData'

const utilizationColor = (u: number | null | undefined): string => {
  if (u == null) return '#4b648b'
  if (u >= 1) return '#ff5f87'
  if (u >= 0.8) return '#ff9d4d'
  if (u >= 0.5) return '#ffe06d'
  return '#53e0a1'
}

const NEUTRAL = '#6b7280'

/**
 * Map our local tramo data onto gasoducto names in the GCIE dataset.
 * CCO === "Centro Oeste"; TGS NQN covers both Neuba I and Neuba II; Gas Andes
 * is the export route (single gasoducto name "Gas Andes").
 */
function stressForGasoducto(
  gasoducto: string,
  tramos: TramoRow | undefined,
): { util: number | null; source: 'tramos' | 'gasoducto' | 'none' } {
  if (!tramos) return { util: null, source: 'none' }
  const cap = (n: number | null, corte: number | null) => {
    if (n == null || n === 0) return null
    return Math.max(0, (n + (corte ?? 0)) / n)
  }
  if (gasoducto === 'Centro Oeste')
    return { util: cap(tramos.cco_capacidad, tramos.cco_corte), source: 'tramos' }
  if (gasoducto === 'Neuba I' || gasoducto === 'Neuba II')
    return { util: cap(tramos.tgs_nqn_capacidad, tramos.tgs_nqn_corte), source: 'tramos' }
  // Gas Andes: we have autorización but no corte column; treat as OK while value > 0
  if (gasoducto === 'Gas Andes')
    return {
      util: tramos.gas_andes_autorizacion != null && tramos.gas_andes_autorizacion > 0 ? 0.5 : null,
      source: 'tramos',
    }
  return { util: null, source: 'none' }
}

/**
 * Node labels we want to show by default (the rest stay on hover to avoid
 * visual noise). Curated: supply sources + main demand hubs.
 */
const ALWAYS_LABELED = new Set<string>([
  'Loma La Lata',
  'Sierra Barrosa',
  'Cerro Dragón',
  'Magallanes',
  'Campo Durán',
  'Bolivia',
  'GNL Escobar',
  'GBA',
  'Pacheco',
  'Anillo Pacheco',
  'Buchanan',
  'Cardales',
  'Bahía Blanca',
  'Rosario',
  'Córdoba',
  'Salta',
  'Esquel',
  'Mendoza',
])

interface Props {
  network: GasNetwork
  outline: CountryOutline
  tramos: TramoRow[]
}

export default function NetworkMap({ network, outline, tramos }: Props) {
  const [hover, setHover] = useState<GasRoute | null>(null)
  const [hoverNode, setHoverNode] = useState<string | null>(null)

  const latestTramo = tramos[tramos.length - 1]

  // Build a viewBox from the Argentina outline bounds — Mercator y grows up,
  // SVG y grows down, so we negate y for rendering.
  const { minX, maxX, minY, maxY } = outline.bounds
  const width = maxX - minX
  const height = maxY - minY
  // Pad so strokes near edges aren't clipped.
  const PAD = width * 0.02
  const viewBox = `${minX - PAD} ${-maxY - PAD} ${width + 2 * PAD} ${height + 2 * PAD}`

  // Project (x, y) -> SVG coords. Just negate y.
  const p = (x: number, y: number) => ({ x, y: -y })

  // Stroke width scaling from latest_caudal (Sept 2025 gasoductos snapshot).
  const maxCaudal = useMemo(() => {
    let m = 0
    for (const r of network.routes) {
      const c = Math.abs(r.latest_caudal ?? 0)
      if (c > m) m = c
    }
    return m || 1
  }, [network])

  const nodesById = useMemo(
    () => Object.fromEntries(network.nodes.map((n) => [n.nodeId, n])),
    [network],
  )

  // Scale for strokes and labels: since viewBox dims are ~2.2e6 x ~4.9e6,
  // we need big numbers for stroke width.
  const strokeBase = Math.min(width, height) * 0.0015 // ~3500
  const fontScale = Math.min(width, height) * 0.008 // ~18000

  return (
    <div>
      <h3 style={sectionTitle}>
        Red de gasoductos — mapa real
        <span style={{ float: 'right', fontSize: 11, color: colors.textDim, textTransform: 'none', fontWeight: 400 }}>
          Topología via{' '}
          <a href="https://github.com/mpodeley/gasoductos" target="_blank" rel="noopener" style={{ color: colors.accent.blue }}>
            mpodeley/gasoductos
          </a>{' '}
          · proyección EPSG:3857
        </span>
      </h3>
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: 'auto',
            background: '#0b1220',
            borderRadius: 8,
            display: 'block',
          }}
        >
          {/* Argentina outline */}
          {outline.polygons.map((poly, i) => {
            const pts = poly.map((v) => `${v.x},${-v.y}`).join(' ')
            return (
              <polygon
                key={i}
                points={pts}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={strokeBase * 0.7}
              />
            )
          })}

          {/* Edges */}
          {network.routes.map((e) => {
            const { util, source } = stressForGasoducto(e.gasoducto, latestTramo)
            const fallbackUtil = e.latest_utilization ?? null
            const chosenUtil = util ?? fallbackUtil
            const stroke =
              source === 'tramos'
                ? utilizationColor(util)
                : fallbackUtil != null
                ? utilizationColor(fallbackUtil)
                : NEUTRAL

            const caudal = Math.abs(e.latest_caudal ?? 0)
            const w = strokeBase * (0.6 + 2.5 * (caudal / maxCaudal))
            const isHover = hover?.edgeId === e.edgeId
            const isDim = hover && !isHover

            return (
              <g
                key={e.edgeId}
                onMouseEnter={() => setHover(e)}
                onMouseLeave={() => setHover(null)}
              >
                <line
                  x1={e.xOrigen}
                  y1={-e.yOrigen}
                  x2={e.xDestino}
                  y2={-e.yDestino}
                  stroke={stroke}
                  strokeWidth={isHover ? w * 1.8 : w}
                  strokeOpacity={isDim ? 0.2 : 0.9}
                />
                {/* Invisible fat stroke for easier hover on tiny lines */}
                <line
                  x1={e.xOrigen}
                  y1={-e.yOrigen}
                  x2={e.xDestino}
                  y2={-e.yDestino}
                  stroke="transparent"
                  strokeWidth={Math.max(w * 3, strokeBase * 2)}
                />
                {isHover && (
                  <text
                    x={(e.xOrigen + e.xDestino) / 2}
                    y={-(e.yOrigen + e.yDestino) / 2 - fontScale * 0.4}
                    fontSize={fontScale}
                    fill={colors.textPrimary}
                    textAnchor="middle"
                    stroke="#0b1220"
                    strokeWidth={fontScale * 0.15}
                    paintOrder="stroke"
                  >
                    {e.gasoducto}
                  </text>
                )}
                {chosenUtil != null && caudal > maxCaudal * 0.25 && !isDim && (
                  <></>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {network.nodes.map((n) => {
            const role = n.roleProxy
            const fill = role === 'source_proxy' ? colors.accent.green
              : role === 'sink_proxy' ? colors.accent.blue
              : role === 'inactive' ? '#475569'
              : '#94a3b8'
            const isSource = role === 'source_proxy'
            const isSink = role === 'sink_proxy'
            const r = isSource ? strokeBase * 2.2 : isSink ? strokeBase * 1.8 : strokeBase * 1.0
            const labeled = ALWAYS_LABELED.has(n.nombre) || hoverNode === n.nodeId
            const { x, y } = p(n.x, n.y)
            return (
              <g
                key={n.nodeId}
                onMouseEnter={() => setHoverNode(n.nodeId)}
                onMouseLeave={() => setHoverNode(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={fill}
                  fillOpacity={0.9}
                  stroke="#0b1220"
                  strokeWidth={strokeBase * 0.35}
                />
                {labeled && (
                  <text
                    x={x + strokeBase * 2.6}
                    y={y + fontScale * 0.3}
                    fontSize={fontScale * 0.9}
                    fill={colors.textSecondary}
                    stroke="#0b1220"
                    strokeWidth={fontScale * 0.12}
                    paintOrder="stroke"
                  >
                    {n.nombre}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

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
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: 2 }}>
              {hover.gasoducto}
            </div>
            <div style={{ color: colors.textDim, fontSize: 11, marginBottom: 6 }}>
              {nodesById[hover.sourceNodeId]?.nombre ?? hover.origen} → {nodesById[hover.targetNodeId]?.nombre ?? hover.destino}
            </div>
            {hover.latest_caudal != null && (
              <Kv label="Caudal (GCIE Sep 2025)" value={`${hover.latest_caudal.toFixed(2)} MMm³/d`} />
            )}
            {hover.effectiveCapacity != null && hover.effectiveCapacity > 0 && (
              <Kv label="Capacidad efectiva" value={`${hover.effectiveCapacity.toFixed(1)} MMm³/d`} />
            )}
            {hover.latest_utilization != null && (
              <Kv label="Utilización" value={`${(hover.latest_utilization * 100).toFixed(0)} %`} />
            )}
            {stressForGasoducto(hover.gasoducto, latestTramo).util != null && (
              <Kv
                label="Stress actual (tramos)"
                value={`${(stressForGasoducto(hover.gasoducto, latestTramo).util! * 100).toFixed(0)} %`}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: space.sm, display: 'flex', gap: space.md, flexWrap: 'wrap', fontSize: 11, color: colors.textDim }}>
        <Pill color="#53e0a1" label="< 50% utilización" />
        <Pill color="#ffe06d" label="50–80%" />
        <Pill color="#ff9d4d" label="80–100%" />
        <Pill color="#ff5f87" label="saturado" />
        <Pill color={NEUTRAL} label="sin dato" />
      </div>
      <p style={{ color: colors.textDim, fontSize: 11, marginTop: space.sm }}>
        Stress pintado con: (a) datos de tramos del Excel para CCO, Neuba I/II y Gas Andes;
        (b) utilización reportada en el snapshot de gasoductos (Sep 2025) para el resto. Grosor
        de la línea = caudal relativo del snapshot. Nodos verdes = fuentes, azules = demanda /
        tránsito, grises = inactivos.
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

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
      {label}
    </span>
  )
}
