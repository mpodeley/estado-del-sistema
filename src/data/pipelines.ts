// Simplified pipeline routes and key injection points for the regional map.
// Coordinates are coarse and meant for visualization only — they approximate
// the traza real but are NOT operational data. Update with higher-fidelity
// geometry when / if official GeoJSON becomes available.

export interface PipelineFeature extends GeoJSON.Feature<GeoJSON.LineString> {
  properties: {
    id: string
    name: string
    operator: 'TGS' | 'TGN' | 'GPNK' | 'OTHER'
    color: string
  }
}

const tgsColor = '#10b981'
const tgnColor = '#3b82f6'
const nkColor = '#f59e0b'
const otherColor = '#8b5cf6'

export const PIPELINE_GEOJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'san_martin',
        name: 'Gasoducto General San Martín (TGS)',
        operator: 'TGS',
        color: tgsColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.0, -38.95], // Neuquén
          [-65.5, -40.0],
          [-62.3, -38.72], // Bahía Blanca
          [-60.5, -37.2],
          [-58.38, -34.6], // Buenos Aires
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'neuba',
        name: 'Gasoducto Neuba II (TGS)',
        operator: 'TGS',
        color: tgsColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.0, -38.95],
          [-66.0, -38.9],
          [-63.0, -38.2],
          [-60.5, -35.5],
          [-58.38, -34.6],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'centro_oeste',
        name: 'Gasoducto Centro Oeste (TGN)',
        operator: 'TGN',
        color: tgnColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.0, -38.95], // Loma La Lata
          [-67.0, -36.0],
          [-65.5, -33.5],
          [-64.19, -31.42], // Córdoba
          [-62.0, -32.5],
          [-60.64, -32.95], // Rosario
          [-58.38, -34.6],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'norte',
        name: 'Gasoducto Norte (TGN)',
        operator: 'TGN',
        color: tgnColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-63.85, -22.05], // Campo Durán, Salta
          [-65.4, -24.79],  // Salta
          [-65.22, -26.81], // Tucumán
          [-64.19, -31.42], // Córdoba
          [-60.64, -32.95], // Rosario
          [-58.38, -34.6],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'nk',
        name: 'Gasoducto Néstor Kirchner (GPNK)',
        operator: 'GPNK',
        color: nkColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-69.0, -38.4], // Tratayén (Vaca Muerta)
          [-65.0, -38.0],
          [-62.0, -36.7], // Salliqueló
          [-60.0, -35.5],
          [-58.38, -34.6],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'cordillerano',
        name: 'Gasoducto Cordillerano',
        operator: 'OTHER',
        color: otherColor,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-68.06, -38.95],
          [-70.6, -40.2],
          [-71.32, -42.91], // Esquel
        ],
      },
    },
  ],
}

export interface InjectionPoint {
  id: string
  name: string
  lat: number
  lon: number
  role: 'supply' | 'lng' | 'import'
}

export const INJECTION_POINTS: InjectionPoint[] = [
  { id: 'neuquen_basin', name: 'Cuenca Neuquina', lat: -38.95, lon: -68.06, role: 'supply' },
  { id: 'vaca_muerta', name: 'Tratayén / Vaca Muerta', lat: -38.4, lon: -69.0, role: 'supply' },
  { id: 'escobar', name: 'GNL Escobar', lat: -34.35, lon: -58.79, role: 'lng' },
  { id: 'bahia_blanca', name: 'GNL Bahía Blanca', lat: -38.72, lon: -62.27, role: 'lng' },
  { id: 'campo_duran', name: 'Campo Durán (Bolivia)', lat: -22.05, lon: -63.85, role: 'import' },
  { id: 'austral', name: 'Cuenca Austral', lat: -53.0, lon: -68.3, role: 'supply' },
]
