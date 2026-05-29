import { useMemo, useState } from 'react'
import { colors, radius, space } from '../theme'
import type { ConcesionesCollection, ConcesionFeature, ProduccionMes } from '../hooks/useData'

// Cuenca Neuquina viewport (lon/lat). Tight crop around the productive area —
// includes the dry margin to the west so the visible polygon shapes have
// breathing room. Matches the bbox used by fetch_concesiones_geojson.py.
const VIEW = {
  lonMin: -71.0,
  lonMax: -67.2,
  latMin: -40.5,
  latMax: -34.0,
}

// EPSG:3857 Mercator. Same math as NetworkMap.tsx — kept local so this
// component doesn't reach into NetworkMap's internals.
const R = 6378137
function toMercator(lat: number, lon: number): { x: number; y: number } {
  const rad = Math.PI / 180
  return {
    x: lon * rad * R,
    y: Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2)) * R,
  }
}

// Operator colors. Pluspetrol intentionally accent-green so it pops; majors
// get a stable hue each.
const OPERATOR_COLORS: Record<string, string> = {
  'YPF S.A.': '#3b82f6',
  'TECPETROL S.A.': '#f59e0b',
  'TOTAL AUSTRAL S.A.': '#8b5cf6',
  'PAN AMERICAN ENERGY SL': '#ef4444',
  'PLUSPETROL S.A.': '#10b981',
  'PLUSPETROL CUENCA NEUQUINA S.R.L.': '#34d399',
  'PAMPA ENERGIA S.A.': '#ec4899',
  'VISTA ENERGY ARGENTINA SAU': '#06b6d4',
  'CHEVRON ARGENTINA S.R.L.': '#f97316',
  'SHELL ARGENTINA S.A.': '#fbbf24',
  'OILSTONE ENERGIA S.A.': '#a78bfa',
  'PETROQUIMICA COMODORO RIVADAVIA S.A.': '#22d3ee',
  'PETROLEOS SUDAMERICANOS S.A.': '#fb7185',
  'Petrolera Aconcagua Energia S.A.': '#84cc16',
  'BENTIA ENERGY S.A.': '#e879f9',
}
const FALLBACK = '#64748b'
function operatorColor(op: string): string {
  return OPERATOR_COLORS[op] ?? FALLBACK
}

function shortOperator(name: string): string {
  return name
    .replace(/\b(S\.?A\.?R?\.?L?\.?|SAU)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function shortBlock(name: string): string {
  return name
    .toLowerCase()
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}

interface Props {
  concesiones: ConcesionesCollection
  produccion: ProduccionMes[]
  latestMes: string | null
}

interface ProjectedFeature {
  feature: ConcesionFeature
  // Each polygon's outer ring as projected SVG points.
  ringStrings: string[]
}

export default function CuencaMap({ concesiones, produccion, latestMes }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)

  // Project the viewport bounds — used to compute viewBox and clip-friendly
  // padding. The SVG y axis flips sign vs Mercator, hence the negation later.
  const vb = useMemo(() => {
    const tl = toMercator(VIEW.latMax, VIEW.lonMin) // top-left
    const br = toMercator(VIEW.latMin, VIEW.lonMax) // bottom-right
    const minX = tl.x
    const maxX = br.x
    const minY = -tl.y // svg-y of latMax
    const maxY = -br.y // svg-y of latMin
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
  }, [])

  const projected = useMemo<ProjectedFeature[]>(() => {
    return concesiones.features.map((f) => {
      const ringStrings: string[] = []
      for (const polygon of f.geometry.coordinates) {
        // GeoJSON polygon[0] = outer ring; we ignore holes (rare on
        // concession polygons, and pyshp doesn't tag winding direction).
        const ring = polygon[0] ?? []
        if (ring.length < 3) continue
        const pts = ring
          .map(([lon, lat]) => {
            const m = toMercator(lat, lon)
            return `${m.x.toFixed(0)},${(-m.y).toFixed(0)}`
          })
          .join(' ')
        ringStrings.push(pts)
      }
      return { feature: f, ringStrings }
    })
  }, [concesiones])

  // Index latest-month production by block name (uppercased & trimmed) so
  // the hover tooltip can look up gas/petróleo/pozos without scanning.
  const prodByArea = useMemo(() => {
    const m = new Map<string, { gas: number; pet: number; pozos: number; empresas: string[] }>()
    for (const r of produccion) {
      if (r.mes !== latestMes) continue
      const key = (r.area || '').trim().toUpperCase()
      const slot = m.get(key) ?? { gas: 0, pet: 0, pozos: 0, empresas: [] }
      slot.gas += r.prod_gas_mm3
      slot.pet += r.prod_pet_m3
      slot.pozos += r.pozos_activos
      if (!slot.empresas.includes(r.empresa)) slot.empresas.push(r.empresa)
      m.set(key, slot)
    }
    return m
  }, [produccion, latestMes])

  const matchedCount = useMemo(() => {
    let n = 0
    for (const p of projected) {
      const k = (p.feature.properties.nombre || '').trim().toUpperCase()
      if (prodByArea.has(k)) n++
    }
    return n
  }, [projected, prodByArea])

  const operatorList = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of projected) counts.set(p.feature.properties.operador, (counts.get(p.feature.properties.operador) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [projected])

  const hovered = projected.find((p) => p.feature.properties.id === hoverId)
  const hoveredProd = hovered ? prodByArea.get((hovered.feature.properties.nombre || '').trim().toUpperCase()) : null
  const daysInLatest = latestMes ? daysInMonth(latestMes) : 30

  const PAD = vb.w * 0.02
  const viewBox = `${vb.minX - PAD} ${vb.minY - PAD} ${vb.w + 2 * PAD} ${vb.h + 2 * PAD}`
  const strokeBase = Math.min(vb.w, vb.h) * 0.001

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm }}>
        <div style={{ color: colors.textMuted, fontSize: 12 }}>
          {projected.length} concesiones — {matchedCount} con producción reportada en {formatMes(latestMes)}
        </div>
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {operatorList.slice(0, 8).map(([op, n]) => (
            <span
              key={op}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: colors.textDim,
                fontSize: 11,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 2, background: operatorColor(op) }} />
              {shortOperator(op)} <span style={{ color: colors.textDim }}>({n})</span>
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', maxHeight: 520, background: '#0b1220', borderRadius: radius.md, display: 'block' }}
      >
        {/* Concesiones — colored by operator. Pluspetrol gets a thicker
            stroke so it's easy to spot. */}
        {projected.map(({ feature, ringStrings }) => {
          const op = feature.properties.operador
          const color = operatorColor(op)
          const isPlus = op.startsWith('PLUSPETROL')
          const isHover = hoverId === feature.properties.id
          const stroke = isHover ? '#f1f5f9' : isPlus ? '#10b981' : '#0b1220'
          return (
            <g
              key={feature.properties.id || feature.properties.nombre}
              onMouseEnter={() => setHoverId(feature.properties.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{ cursor: 'pointer' }}
            >
              {ringStrings.map((pts, i) => (
                <polygon
                  key={i}
                  points={pts}
                  fill={color}
                  fillOpacity={isHover ? 0.85 : 0.55}
                  stroke={stroke}
                  strokeWidth={strokeBase * (isHover ? 320 : isPlus ? 240 : 80)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          )
        })}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: space.md,
            left: space.md,
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: `${space.sm}px ${space.md}px`,
            color: colors.textSecondary,
            fontSize: 12,
            maxWidth: 260,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 13 }}>
            {shortBlock(hovered.feature.properties.nombre)}
          </div>
          <div style={{ color: operatorColor(hovered.feature.properties.operador), fontSize: 12, marginTop: 2 }}>
            {shortOperator(hovered.feature.properties.operador)}
          </div>
          {hoveredProd ? (
            <div style={{ marginTop: space.sm, lineHeight: 1.6 }}>
              <div>
                Gas: <strong>{(hoveredProd.gas / daysInLatest).toFixed(2)}</strong> MMm³/d
                <span style={{ color: colors.textDim }}> ({hoveredProd.gas.toFixed(0)} MMm³/mes)</span>
              </div>
              <div>
                Petróleo: <strong>{((hoveredProd.pet * 6.2898) / daysInLatest / 1000).toFixed(2)}</strong> kbbl/d
              </div>
              <div>Pozos activos: <strong>{hoveredProd.pozos}</strong></div>
              {hoveredProd.empresas.length > 1 && (
                <div style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
                  Reportan: {hoveredProd.empresas.map(shortOperator).join(', ')}
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: space.sm, color: colors.textDim }}>
              Sin producción reportada en {formatMes(latestMes)}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatMes(mes: string | null): string {
  if (!mes) return '—'
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, (m || 1) - 1, 1))
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function daysInMonth(mes: string): number {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
