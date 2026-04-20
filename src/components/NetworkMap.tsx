import { useMemo, useState } from 'react'
import { colors, sectionTitle, space } from '../theme'
import type {
  GasNetwork,
  GasRoute,
  CountryOutline,
  TramoRow,
  DistribuidorasCollection,
  EnargasMonthly,
  GedRow,
} from '../hooks/useData'

const NEUTRAL = '#64748b'

const utilizationColor = (u: number | null | undefined): string => {
  if (u == null) return NEUTRAL
  if (u >= 1) return '#ff5f87'
  if (u >= 0.8) return '#ff9d4d'
  if (u >= 0.5) return '#ffe06d'
  return '#53e0a1'
}

// Transport operator per gasoducto name. Kept here because the gasoductos
// dataset doesn't carry it (it only has gasoducto name). Names vary in
// encoding; compare with normalized forms.
type Operator = 'TGN' | 'TGS' | 'GPNK' | 'Camuzzi' | 'Export' | 'Otro'

const OPERATOR_COLORS: Record<Operator, string> = {
  TGN: '#60a5fa',
  TGS: '#34d399',
  GPNK: '#fbbf24',
  Camuzzi: '#a78bfa',
  Export: '#f472b6',
  Otro: NEUTRAL,
}

const OPERATOR_BY_GASODUCTO: Record<string, Operator> = {
  'Centro Oeste': 'TGN',
  'Norte': 'TGN',
  'TF TGN': 'TGN',
  'TF TGN - Contraflujo': 'TGN',
  'Neuba I': 'TGS',
  'Neuba II': 'TGS',
  'San Martín': 'TGS',
  'TF TGS': 'TGS',
  'Perito Moreno': 'GPNK',
  'Perito Moreno tie-in': 'GPNK',
  'Cordillerano': 'Camuzzi',
  'Patagónico': 'Camuzzi',
  'Fueguino': 'Camuzzi',
  'Gas Andes': 'Export',
  'Nor Andino': 'Export',
  'Nor Andino Exp': 'Export',
  'Nor Andino Imp': 'Export',
  'Methanex': 'Export',
  'Cruz del Sur': 'Export',
  'Pacífico': 'Export',
  'Juana Azurduy': 'Export',
  'Mercedes-Cardales': 'Otro',
}

function stressForGasoducto(
  gasoducto: string,
  tramos: TramoRow | undefined,
): number | null {
  if (!tramos) return null
  const util = (n: number | null, corte: number | null) => {
    if (n == null || n === 0) return null
    return Math.max(0, (n + (corte ?? 0)) / n)
  }
  if (gasoducto === 'Centro Oeste')
    return util(tramos.cco_capacidad, tramos.cco_corte)
  if (gasoducto === 'Neuba I' || gasoducto === 'Neuba II')
    return util(tramos.tgs_nqn_capacidad, tramos.tgs_nqn_corte)
  if (gasoducto === 'Gas Andes')
    return tramos.gas_andes_autorizacion != null && tramos.gas_andes_autorizacion > 0 ? 0.5 : null
  return null
}

// Curated anchor labels that stay visible to orient the viewer.
const ALWAYS_LABELED = new Set<string>([
  'Loma La Lata',
  'Sierra Barrosa',
  'Cerro Dragón',
  'Magallanes',
  'Campo Durán',
  'Bolivia',
  'GNL Escobar',
  'Bahía Blanca',
  'Mercedes',
])

// Cuencas: approximate centroids (lat, lon) + the field in the ENARGAS
// monthly data that carries its volume.
const CUENCAS: { id: string; label: string; lat: number; lon: number }[] = [
  { id: 'neuquina', label: 'Cuenca Neuquina', lat: -38.6, lon: -69.5 },
  { id: 'noroeste', label: 'Cuenca Noroeste (NOA)', lat: -24.5, lon: -64.5 },
  { id: 'san_jorge', label: 'Cuenca San Jorge', lat: -45.5, lon: -68.5 },
  { id: 'austral', label: 'Cuenca Austral', lat: -52.3, lon: -68.5 },
]

// Project lat/lon -> Web Mercator metres (EPSG:3857).
const R = 6378137
function toMercator(lat: number, lon: number): { x: number; y: number } {
  const rad = Math.PI / 180
  const x = lon * rad * R
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2)) * R
  return { x, y }
}

interface Props {
  network: GasNetwork
  outline: CountryOutline
  tramos: TramoRow[]
  distribuidoras?: DistribuidorasCollection | null
  monthly?: EnargasMonthly | null
}

const DIST_COLORS: Record<string, string> = {
  metrogas: '#3b82f6',
  naturgy_ban: '#8b5cf6',
  pampeana: '#06b6d4',
  sur: '#0891b2',
  litoral: '#22d3ee',
  centro: '#eab308',
  cuyana: '#f59e0b',
  gasnor: '#ef4444',
  gasnea: '#ec4899',
}

/** Centroid of the largest ring in a GeoJSON MultiPolygon (already projected
 *  to EPSG:3857). Returns (x, y). Used for bubble placement. */
function polyCentroid(multi: number[][][][]): { x: number; y: number } {
  let best: number[][] | null = null
  let bestArea = 0
  for (const poly of multi) {
    const ring = poly[0]
    if (!ring || ring.length < 3) continue
    // Shoelace for absolute area (ignoring hole subtraction).
    let a = 0
    for (let i = 0; i < ring.length - 1; i++) {
      a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    }
    a = Math.abs(a) / 2
    if (a > bestArea) {
      bestArea = a
      best = ring
    }
  }
  if (!best) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const [x, y] of best) {
    sx += x
    sy += y
  }
  return { x: sx / best.length, y: sy / best.length }
}

export default function NetworkMap({ network, outline, tramos, distribuidoras, monthly }: Props) {
  const [hover, setHover] = useState<GasRoute | null>(null)
  const [hoverDist, setHoverDist] = useState<string | null>(null)
  const [hoverCuenca, setHoverCuenca] = useState<string | null>(null)

  const latestTramo = tramos[tramos.length - 1]

  const { minX, maxX, minY, maxY } = outline.bounds
  const width = maxX - minX
  const height = maxY - minY
  const PAD = width * 0.02
  const viewBox = `${minX - PAD} ${-maxY - PAD} ${width + 2 * PAD} ${height + 2 * PAD}`

  // Stroke/font scale tuned for the SVG being rendered around 560 px wide —
  // viewBox units are Mercator metres, so multipliers look weirdly large.
  const strokeBase = Math.min(width, height) * 0.015
  const fontScale = Math.min(width, height) * 0.24

  // ----- edge width scaling -----
  const maxCaudal = useMemo(() => {
    let m = 0
    for (const r of network.routes) {
      const c = Math.abs(r.latest_caudal ?? 0)
      if (c > m) m = c
    }
    return m || 1
  }, [network])

  // ----- cuenca bubbles -----
  const cuencaData = useMemo(() => {
    const latest = monthly?.gas_recibido?.cuenca?.[monthly.gas_recibido.cuenca.length - 1]
    if (!latest) return []
    const vol = {
      neuquina: (latest.tgn_neuquina ?? 0) + (latest.tgs_neuquina ?? 0),
      noroeste: latest.tgn_noroeste ?? 0,
      san_jorge: latest.tgs_san_jorge ?? 0,
      austral: latest.tgs_austral ?? 0,
    }
    const max = Math.max(1, ...Object.values(vol))
    return CUENCAS.map((c) => {
      const v = vol[c.id as keyof typeof vol] ?? 0
      const { x, y } = toMercator(c.lat, c.lon)
      return {
        ...c,
        volDam3Month: v,
        volMMm3Day: v / 1000 / 30,
        r: strokeBase * (4 + 18 * Math.sqrt(v / max)),
        x,
        y,
      }
    })
  }, [monthly, strokeBase])

  // ----- distribuidora bubbles from GED (authoritative monthly consumption) -----
  const distBubbles = useMemo(() => {
    if (!distribuidoras?.features) return []
    const ged = monthly?.gas_entregado
    const latest = ged && ged.length > 0 ? ged[ged.length - 1] : null
    const values: Record<string, number> = {}
    let max = 1
    for (const f of distribuidoras.features) {
      const id = f.properties.id as keyof GedRow
      const v = latest && typeof latest[id] === 'number' ? (latest[id] as number) : 0
      values[f.properties.id] = v
      if (v > max) max = v
    }
    return distribuidoras.features.map((f) => {
      const id = f.properties.id
      const v = values[id] ?? 0
      const { x, y } = polyCentroid(f.geometry.coordinates)
      // Value comes in dam³/month; divide by 1000 * 28 for MMm³/d (approx).
      const perDay = v / 1000 / 28
      return {
        id,
        name: f.properties.name,
        x,
        y,
        gedDam3Month: v,
        gedMMm3Day: perDay,
        r: strokeBase * (3 + 15 * Math.sqrt(v / max)),
      }
    })
  }, [distribuidoras, monthly, strokeBase])

  const nodesById = useMemo(
    () => Object.fromEntries(network.nodes.map((n) => [n.nodeId, n])),
    [network],
  )

  return (
    <div>
      <h3 style={sectionTitle}>
        Red de gasoductos — mapa real
        <span style={{ float: 'right', fontSize: 11, color: colors.textDim, textTransform: 'none', fontWeight: 400 }}>
          Topología via{' '}
          <a href="https://github.com/mpodeley/gasoductos" target="_blank" rel="noopener" style={{ color: colors.accent.blue }}>
            mpodeley/gasoductos
          </a>
        </span>
      </h3>
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: '#0b1220', borderRadius: 8, display: 'block' }}
        >
          {/* Argentina outline */}
          {outline.polygons.map((poly, i) => (
            <polygon
              key={i}
              points={poly.map((v) => `${v.x},${-v.y}`).join(' ')}
              fill="#1e293b"
              stroke="#334155"
              strokeWidth={strokeBase * 0.7}
            />
          ))}

          {/* Distribuidora regions — subtle fill */}
          {distribuidoras?.features.map((f) => {
            const id = f.properties.id
            const color = DIST_COLORS[id] ?? '#475569'
            const isHover = hoverDist === id
            return (
              <g
                key={id}
                onMouseEnter={() => setHoverDist(id)}
                onMouseLeave={() => setHoverDist(null)}
              >
                {f.geometry.coordinates.map((polygon, pi) => (
                  <polygon
                    key={pi}
                    points={(polygon[0] ?? []).map(([x, y]) => `${x},${-y}`).join(' ')}
                    fill={color}
                    fillOpacity={isHover ? 0.35 : 0.15}
                    stroke={color}
                    strokeOpacity={isHover ? 0.8 : 0.35}
                    strokeWidth={strokeBase * (isHover ? 0.6 : 0.25)}
                  />
                ))}
              </g>
            )
          })}

          {/* Pipelines: operator color by default, stress color overrides for
              the 3 tramos we track (CCO, Neuba I/II, Gas Andes). */}
          {network.routes.map((e) => {
            const util = stressForGasoducto(e.gasoducto, latestTramo)
            const hasStress = util != null
            const operator: Operator = OPERATOR_BY_GASODUCTO[e.gasoducto] ?? 'Otro'
            const color = hasStress ? utilizationColor(util) : OPERATOR_COLORS[operator]
            const caudal = Math.abs(e.latest_caudal ?? 0)
            const w = strokeBase * (0.8 + 3.0 * (caudal / maxCaudal))
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
                  stroke={color}
                  strokeWidth={isHover ? w * 1.7 : w}
                  strokeOpacity={isDim ? 0.2 : 0.9}
                />
                <line
                  x1={e.xOrigen}
                  y1={-e.yOrigen}
                  x2={e.xDestino}
                  y2={-e.yDestino}
                  stroke="transparent"
                  strokeWidth={Math.max(w * 3, strokeBase * 2)}
                />
              </g>
            )
          })}

          {/* Network nodes — bigger dots and readable labels */}
          {network.nodes.map((n) => {
            const role = n.roleProxy
            const fill = role === 'source_proxy' ? '#34d399'
              : role === 'sink_proxy' ? '#60a5fa'
              : role === 'inactive' ? '#475569'
              : '#94a3b8'
            const r = role === 'source_proxy' ? strokeBase * 1.6 : role === 'sink_proxy' ? strokeBase * 1.3 : strokeBase * 0.9
            const labeled = ALWAYS_LABELED.has(n.nombre)
            return (
              <g key={n.nodeId}>
                <circle cx={n.x} cy={-n.y} r={r} fill={fill} fillOpacity={0.9} stroke="#0b1220" strokeWidth={strokeBase * 0.3} />
                {labeled && (
                  <text
                    x={n.x + strokeBase * 2.2}
                    y={-n.y + fontScale * 0.3}
                    fontSize={fontScale * 0.95}
                    fill={colors.textSecondary}
                    stroke="#0b1220"
                    strokeWidth={fontScale * 0.15}
                    paintOrder="stroke"
                    fontWeight={500}
                  >
                    {n.nombre}
                  </text>
                )}
              </g>
            )
          })}

          {/* Cuenca bubbles (supply) */}
          {cuencaData.map((c) => (
            <g
              key={c.id}
              onMouseEnter={() => setHoverCuenca(c.id)}
              onMouseLeave={() => setHoverCuenca(null)}
            >
              <circle
                cx={c.x}
                cy={-c.y}
                r={c.r}
                fill="#34d399"
                fillOpacity={hoverCuenca === c.id ? 0.55 : 0.3}
                stroke="#34d399"
                strokeWidth={strokeBase * 0.6}
              />
              <text
                x={c.x}
                y={-c.y - c.r - fontScale * 0.35}
                fontSize={fontScale * 1.4}
                fill={colors.textPrimary}
                textAnchor="middle"
                stroke="#0b1220"
                strokeWidth={fontScale * 0.18}
                paintOrder="stroke"
                fontWeight={700}
              >
                {c.label.replace('Cuenca ', '')}
              </text>
              <text
                x={c.x}
                y={-c.y + fontScale * 0.45}
                fontSize={fontScale * 0.95}
                fill={colors.textSecondary}
                textAnchor="middle"
                stroke="#0b1220"
                strokeWidth={fontScale * 0.15}
                paintOrder="stroke"
                fontWeight={600}
              >
                {c.volMMm3Day.toFixed(0)} MMm³/d
              </text>
            </g>
          ))}

          {/* Distribuidora bubbles (demand) */}
          {distBubbles.map((b) => {
            const color = DIST_COLORS[b.id] ?? '#475569'
            return (
              <g
                key={b.id}
                onMouseEnter={() => setHoverDist(b.id)}
                onMouseLeave={() => setHoverDist(null)}
              >
                <circle
                  cx={b.x}
                  cy={-b.y}
                  r={b.r}
                  fill={color}
                  fillOpacity={hoverDist === b.id ? 0.75 : 0.5}
                  stroke={color}
                  strokeWidth={strokeBase * 0.4}
                />
                {(hoverDist === b.id || b.gedDam3Month > 100000) && (
                  <>
                    <text
                      x={b.x}
                      y={-b.y - fontScale * 0.2}
                      fontSize={fontScale * 0.95}
                      fill={colors.textPrimary}
                      textAnchor="middle"
                      stroke="#0b1220"
                      strokeWidth={fontScale * 0.15}
                      paintOrder="stroke"
                      fontWeight={700}
                    >
                      {b.name.split(' ')[0]}
                    </text>
                    <text
                      x={b.x}
                      y={-b.y + fontScale * 0.7}
                      fontSize={fontScale * 0.75}
                      fill={colors.textSecondary}
                      textAnchor="middle"
                      stroke="#0b1220"
                      strokeWidth={fontScale * 0.12}
                      paintOrder="stroke"
                      fontWeight={600}
                    >
                      {b.gedMMm3Day.toFixed(1)} MMm³/d
                    </text>
                  </>
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
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: 2 }}>
              {hover.gasoducto}
            </div>
            <div style={{ color: colors.textDim, fontSize: 11, marginBottom: 4 }}>
              {OPERATOR_BY_GASODUCTO[hover.gasoducto] ?? 'Otro'} ·{' '}
              {nodesById[hover.sourceNodeId]?.nombre ?? hover.origen} → {nodesById[hover.targetNodeId]?.nombre ?? hover.destino}
            </div>
            {hover.latest_caudal != null && (
              <Kv label="Caudal" value={`${hover.latest_caudal.toFixed(2)} MMm³/d`} />
            )}
            {hover.effectiveCapacity != null && hover.effectiveCapacity > 0 && (
              <Kv label="Capacidad" value={`${hover.effectiveCapacity.toFixed(1)} MMm³/d`} />
            )}
            {stressForGasoducto(hover.gasoducto, latestTramo) != null && (
              <Kv
                label="Stress actual"
                value={`${(stressForGasoducto(hover.gasoducto, latestTramo)! * 100).toFixed(0)}%`}
              />
            )}
            {hover.latest_utilization != null && stressForGasoducto(hover.gasoducto, latestTramo) == null && (
              <Kv
                label="Util. (GCIE 2025-09)"
                value={`${(hover.latest_utilization * 100).toFixed(0)}%`}
              />
            )}
          </div>
        )}
      </div>

      {/* Legends */}
      <div style={{ marginTop: space.sm, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: space.md, fontSize: 11, color: colors.textDim }}>
        <div>
          <div style={{ color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Operador (línea)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
            {(Object.keys(OPERATOR_COLORS) as Operator[]).map((op) => (
              <Pill key={op} color={OPERATOR_COLORS[op]} label={op} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Stress (tramos Excel)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.sm }}>
            <Pill color="#53e0a1" label="< 50%" />
            <Pill color="#ffe06d" label="50–80%" />
            <Pill color="#ff9d4d" label="80–100%" />
            <Pill color="#ff5f87" label="saturado" />
          </div>
        </div>
      </div>
      <p style={{ color: colors.textDim, fontSize: 11, marginTop: space.sm }}>
        Líneas coloreadas por operador; donde el Excel trae capacidad + corte (CCO, Neuba I/II, Gas
        Andes) el color pasa a reflejar el stress (verde→rojo). Grosor = caudal relativo del snapshot
        GCIE. Burbujas verdes sobre cuencas = volumen mensual inyectado ({formatVolDate(monthly)}).
        Burbujas coloreadas sobre zonas de distribuidoras = <strong>gas efectivamente entregado
        </strong> (ENARGAS GED, {formatGedDate(monthly)}).
      </p>
    </div>
  )
}

function formatVolDate(monthly: EnargasMonthly | null | undefined): string {
  const s = monthly?.gas_recibido?.cuenca?.[(monthly.gas_recibido.cuenca.length ?? 0) - 1]?.fecha
  return s ? s.slice(0, 7) : 'último mes'
}

function formatGedDate(monthly: EnargasMonthly | null | undefined): string {
  const arr = monthly?.gas_entregado
  const s = arr && arr.length > 0 ? arr[arr.length - 1].fecha : undefined
  return s ? s.slice(0, 7) : 'último mes'
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
