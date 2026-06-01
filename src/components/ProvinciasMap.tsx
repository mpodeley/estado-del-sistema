import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { colors, iconBtn, radius, space } from '../theme'
import { useMapPanZoom } from '../hooks/useMapPanZoom'
import type { ProvinciasCollection, ProvinciaFeature, ProvinciaConsumoRow } from '../hooks/useData'

// 7-step monochromatic heatmap — same warm ramp as CuencaMap so the two maps
// read consistently on the dark background.
const HEAT_PALETTE = ['#451a03', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fbbf24']
const NO_DATA = '#334155'

interface Props {
  provincias: ProvinciasCollection
  consumo: ProvinciaConsumoRow[]
}

interface ProjectedProvincia {
  feature: ProvinciaFeature
  ringStrings: string[]
  /** dam³/mes del último mes (suma de la provincia). */
  totalLatest: number | null
  /** densidad = dam³/mes · km⁻² del último mes. */
  density: number
}

function numVal(row: ProvinciaConsumoRow | undefined, slug: string): number | null {
  if (!row) return null
  const v = row[slug]
  return typeof v === 'number' ? v : null
}

export default function ProvinciasMap({ provincias, consumo }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const latestRow = consumo.length > 0 ? consumo[consumo.length - 1] : undefined
  const latestFecha = (latestRow?.fecha as string) ?? null

  // Coordinates are already EPSG:3857 (integer metres), like distribuidoras.geojson.
  // Use them directly with y negated (SVG y-down) — no Mercator math here.
  const baseVB = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const f of provincias.features) {
      for (const poly of f.geometry.coordinates) {
        for (const [x, y] of poly[0] ?? []) {
          const sy = -y
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (sy < minY) minY = sy
          if (sy > maxY) maxY = sy
        }
      }
    }
    const w = maxX - minX
    const h = maxY - minY
    return { minX, minY, w, h, cx: minX + w / 2, cy: minY + h / 2 }
  }, [provincias])

  const { svgRef, viewBox, isDragging, handlers, zoomIn, zoomOut, reset } = useMapPanZoom(baseVB)

  const projected = useMemo<ProjectedProvincia[]>(() => {
    return provincias.features.map((f) => {
      const ringStrings: string[] = []
      for (const poly of f.geometry.coordinates) {
        const ring = poly[0] ?? []
        if (ring.length < 3) continue
        ringStrings.push(ring.map(([x, y]) => `${x},${-y}`).join(' '))
      }
      const totalLatest = numVal(latestRow, f.properties.id)
      const area = f.properties.area_km2 || 0
      const density = totalLatest != null && area > 0 ? totalLatest / area : 0
      return { feature: f, ringStrings, totalLatest, density }
    })
  }, [provincias, latestRow])

  // Quantile thresholds for the density heatmap (one per palette step).
  const bins = useMemo(() => {
    const sorted = projected.map((p) => p.density).filter((v) => v > 0).sort((a, b) => a - b)
    if (sorted.length === 0) return []
    const out: number[] = []
    for (let i = 1; i < HEAT_PALETTE.length; i++) {
      const idx = Math.floor((i * sorted.length) / HEAT_PALETTE.length)
      out.push(sorted[Math.min(idx, sorted.length - 1)])
    }
    return out
  }, [projected])

  function densityColor(value: number): string {
    if (value <= 0 || bins.length === 0) return NO_DATA
    let idx = 0
    while (idx < bins.length && value >= bins[idx]) idx++
    return HEAT_PALETTE[idx] ?? HEAT_PALETTE[HEAT_PALETTE.length - 1]
  }

  const matchedCount = projected.filter((p) => p.totalLatest != null).length
  const hovered = projected.find((p) => p.feature.properties.id === hoverId)
  const selected = projected.find((p) => p.feature.properties.id === selectedId)

  // Monthly series (MMm³/mes) for the selected province.
  const selectedSeries = useMemo(() => {
    if (!selectedId) return []
    return consumo
      .map((r) => {
        const v = numVal(r, selectedId)
        return { fecha: (r.fecha as string).slice(0, 7), mmm3: v != null ? v / 1000 : null }
      })
      .filter((d) => d.mmm3 != null)
  }, [consumo, selectedId])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm }}>
        <div style={{ color: colors.textMuted, fontSize: 12 }}>
          {matchedCount} provincias con red de gas — consumo de {formatMes(latestFecha)}
        </div>
        <div style={{ color: colors.textDim, fontSize: 11 }}>click en una provincia para ver su evolución</div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          {...handlers}
          style={{
            width: '100%', height: 'auto', maxHeight: 560,
            background: '#0b1220', borderRadius: radius.md, display: 'block',
            cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none',
          }}
        >
          {projected.map((p) => {
            const id = p.feature.properties.id
            const isHover = hoverId === id
            const isSel = selectedId === id
            const fill = densityColor(p.density)
            return (
              <g
                key={id}
                onMouseEnter={() => !isDragging && setHoverId(id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => !isDragging && setSelectedId(isSel ? null : id)}
                style={{ pointerEvents: isDragging ? 'none' : 'auto', cursor: 'pointer' }}
              >
                {p.ringStrings.map((pts, i) => (
                  <polygon
                    key={i}
                    points={pts}
                    fill={fill}
                    fillOpacity={isHover || isSel ? 0.95 : 0.8}
                    stroke={isSel ? '#f1f5f9' : isHover ? '#cbd5e1' : '#0b1220'}
                    strokeWidth={isSel ? 2 : isHover ? 1.5 : 0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            )
          })}
        </svg>

        <div style={{ position: 'absolute', top: space.sm, right: space.sm, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={zoomIn} style={iconBtn} title="Acercar">＋</button>
          <button onClick={zoomOut} style={iconBtn} title="Alejar">－</button>
          <button onClick={reset} style={iconBtn} title="Reset">⟲</button>
        </div>

        {hovered && (
          <div style={{
            position: 'absolute', top: space.md, left: space.md, background: colors.surface,
            border: `1px solid ${colors.border}`, borderRadius: radius.md,
            padding: `${space.sm}px ${space.md}px`, color: colors.textSecondary, fontSize: 12,
            maxWidth: 260, pointerEvents: 'none',
          }}>
            <div style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 13 }}>
              {hovered.feature.properties.name}
            </div>
            {hovered.totalLatest != null ? (
              <div style={{ marginTop: space.sm, lineHeight: 1.6 }}>
                <div>Consumo: <strong>{(hovered.totalLatest / 1000).toFixed(1)}</strong> MMm³/mes</div>
                <div>Densidad: <strong>{hovered.density.toFixed(2)}</strong> mil m³/mes·km⁻²</div>
                <div style={{ color: colors.textDim, fontSize: 11, marginTop: 4 }}>
                  Área: {hovered.feature.properties.area_km2.toLocaleString('es-AR')} km²
                </div>
              </div>
            ) : (
              <div style={{ marginTop: space.sm, color: colors.textDim }}>Sin red de distribución.</div>
            )}
          </div>
        )}
      </div>

      <HeatLegend bins={bins} unit="mil m³/mes · km⁻² (densidad)" />

      {selected && (
        <div style={{ marginTop: space.md, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: space.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space.sm }}>
            <div style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 700 }}>
              {selected.feature.properties.name}
              <span style={{ color: colors.textDim, fontWeight: 400, fontSize: 12 }}> — consumo mensual (MMm³)</span>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ ...iconBtn, width: 'auto', padding: '2px 10px' }} title="Cerrar">✕</button>
          </div>
          {selectedSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={selectedSeries} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="provFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent.orange} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={colors.accent.orange} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" tick={{ fill: colors.textDim, fontSize: 10 }} minTickGap={40} />
                <YAxis tick={{ fill: colors.textDim, fontSize: 10 }} width={44} />
                <Tooltip
                  contentStyle={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: 12 }}
                  labelStyle={{ color: colors.textMuted }}
                  formatter={(v: number) => [`${v.toFixed(1)} MMm³`, 'Consumo']}
                />
                <Area type="monotone" dataKey="mmm3" stroke={colors.accent.orange} fill="url(#provFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: colors.textDim, fontSize: 12 }}>Sin serie disponible.</div>
          )}
        </div>
      )}

      <p style={{ color: colors.textDim, fontSize: 11, marginTop: space.sm, lineHeight: 1.5 }}>
        Color = densidad de gas entregado por la red de distribución (último mes) sobre la superficie provincial.
        No incluye usinas ni grandes usuarios que compran gas directo al productor. Fuente: ENARGAS (cuadro 1.06).
        Wheel para zoom, click + arrastrar para mover.
      </p>
    </div>
  )
}

function HeatLegend({ bins, unit }: { bins: number[]; unit: string }) {
  if (bins.length === 0) return null
  const labels = formatBins(bins)
  return (
    <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', marginTop: space.sm }}>
      <span style={{ color: colors.textDim, fontSize: 11, marginRight: 6 }}>{unit}</span>
      {HEAT_PALETTE.map((c, i) => (
        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.textMuted, fontSize: 11, paddingRight: 6 }}>
          <span style={{ display: 'inline-block', width: 14, height: 10, background: c, borderRadius: 2 }} />
          {labels[i]}
        </span>
      ))}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.textMuted, fontSize: 11 }}>
        <span style={{ display: 'inline-block', width: 14, height: 10, background: NO_DATA, borderRadius: 2 }} />
        sin datos
      </span>
    </div>
  )
}

function formatBins(bins: number[]): string[] {
  const fmt = (v: number): string => {
    if (v === 0) return '0'
    if (v < 1) return v.toFixed(2)
    if (v < 10) return v.toFixed(1)
    if (v < 1000) return v.toFixed(0)
    return `${(v / 1000).toFixed(1)}k`
  }
  const labels: string[] = [`< ${fmt(bins[0])}`]
  for (let i = 1; i < bins.length; i++) labels.push(`${fmt(bins[i - 1])}+`)
  labels.push(`≥ ${fmt(bins[bins.length - 1])}`)
  return labels
}

function formatMes(mes: string | null): string {
  if (!mes) return '—'
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, 1)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
