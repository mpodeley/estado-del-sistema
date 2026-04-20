import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { colors } from '../theme'
import { PIPELINE_GEOJSON, INJECTION_POINTS } from '../data/pipelines'
import type { RegionCity } from '../types'

interface Props {
  cities: RegionCity[]
  /** Index (0 = today, 1 = tomorrow, …) of the forecast day to render. */
  dayIndex: number
  onSelectCity?: (cityId: string) => void
}

// Color ramp: cold → hot. Same palette as the temperature chart references.
function tempColor(temp: number | null): string {
  if (temp == null) return '#475569'
  if (temp <= 5) return '#1e3a8a'
  if (temp <= 10) return '#2563eb'
  if (temp <= 15) return '#0891b2'
  if (temp <= 20) return '#10b981'
  if (temp <= 25) return '#f59e0b'
  if (temp <= 30) return '#f97316'
  return '#ef4444'
}

export default function RegionalMap({ cities, dayIndex, onSelectCity }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const [ready, setReady] = useState(false)

  // Mount the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [-64, -36],
      zoom: 3.4,
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      // Pipelines layer
      map.addSource('pipelines', { type: 'geojson', data: PIPELINE_GEOJSON })
      map.addLayer({
        id: 'pipelines-line',
        type: 'line',
        source: 'pipelines',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 0.85,
        },
      })

      // Injection points
      map.addSource('injections', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: INJECTION_POINTS.map((p) => ({
            type: 'Feature',
            properties: { name: p.name, role: p.role },
            geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          })),
        },
      })
      map.addLayer({
        id: 'injections-marker',
        type: 'circle',
        source: 'injections',
        paint: {
          'circle-radius': 5,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      })

      // Cities placeholder — data is set below.
      map.addSource('cities', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'cities-circle',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': 10,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      })

      setReady(true)
    })

    map.on('click', 'cities-circle', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const props = feature.properties as { id: string; label: string; temp: number | null }
      if (onSelectCity) onSelectCity(props.id)
      const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates
      if (popupRef.current) popupRef.current.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, offset: 14 })
        .setLngLat([lon, lat])
        .setHTML(
          `<div style="color:#0f172a"><strong>${props.label}</strong><br/>` +
          `Temp prom: ${props.temp != null ? props.temp + '°C' : 's/d'}</div>`,
        )
        .addTo(map)
    })

    map.on('mouseenter', 'cities-circle', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'cities-circle', () => {
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [onSelectCity])

  // Update city layer whenever the day or cities change.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const features: GeoJSON.Feature[] = cities.map((c) => {
      const day = c.forecast[dayIndex]
      const temp = day?.temp_prom ?? null
      return {
        type: 'Feature',
        properties: { id: c.id, label: c.label, temp, color: tempColor(temp) },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      }
    })
    const source = map.getSource('cities') as maplibregl.GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features })
  }, [cities, dayIndex, ready])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          maxHeight: 480,
          borderRadius: 8,
          overflow: 'hidden',
          background: colors.surfaceAlt,
        }}
      />
      <MapLegend />
    </div>
  )
}

function MapLegend() {
  const ramp = [
    { label: '≤5°', color: '#1e3a8a' },
    { label: '10°', color: '#2563eb' },
    { label: '15°', color: '#0891b2' },
    { label: '20°', color: '#10b981' },
    { label: '25°', color: '#f59e0b' },
    { label: '30°', color: '#f97316' },
    { label: '>30°', color: '#ef4444' },
  ]
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        background: 'rgba(15,23,42,0.9)',
        borderRadius: 6,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: colors.textSecondary,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: colors.textDim }}>Temp prom</span>
      {ramp.map((r) => (
        <span key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 10, height: 10, background: r.color, borderRadius: '50%' }} />
          {r.label}
        </span>
      ))}
    </div>
  )
}
