/**
 * Simplified network topology for the schematic. Coordinates are layout-only
 * (not geographic) — supply nodes on the left, pipelines across the middle,
 * demand zones on the right. Kept here as data so tweaking positions doesn't
 * require editing the render component.
 */

export interface NetworkNode {
  id: string
  label: string
  x: number
  y: number
  role: 'supply' | 'demand' | 'export'
  note?: string
}

export interface NetworkEdge {
  id: string
  label: string
  operator: 'TGS' | 'TGN' | 'GPNK' | 'Otro'
  fromId: string
  toId: string
  /** Maps to data keys. When tramosKey is set we have real capacity+corte
   *  data; otherwise we only show flow-based line width. */
  tramosKey?: 'cco' | 'tgs_nqn' | 'gas_andes'
  /** Key in enargas_monthly.gasoducto used to drive stroke width. */
  flowKey?:
    | 'tgn_centro_oeste'
    | 'tgn_norte'
    | 'tgs_neuba'
    | 'tgs_san_martin'
  /** Nominal capacity MMm³/d when not reported in tramos.json (rough). */
  nominalCapacity?: number
}

const V = 620 // virtual height
const W = 960 // virtual width

// ---------- supply (left column) ----------
const SUPPLY: NetworkNode[] = [
  { id: 'noa', label: 'Cuenca Noroeste + Bolivia', x: 60, y: 80, role: 'supply' },
  { id: 'neuquina', label: 'Cuenca Neuquina / Vaca Muerta', x: 60, y: 280, role: 'supply' },
  { id: 'san_jorge', label: 'Cuenca San Jorge', x: 60, y: 420, role: 'supply' },
  { id: 'austral', label: 'Cuenca Austral', x: 60, y: 520, role: 'supply' },
]

// ---------- demand (right column) ----------
const DEMAND: NetworkNode[] = [
  { id: 'gasnor', label: 'Gasnor (NOA)', x: W - 60, y: 60, role: 'demand' },
  { id: 'litoral', label: 'Litoral', x: W - 60, y: 140, role: 'demand' },
  { id: 'centro', label: 'Centro', x: W - 60, y: 210, role: 'demand' },
  { id: 'cuyana', label: 'Cuyana', x: W - 60, y: 280, role: 'demand' },
  { id: 'metrogas', label: 'Metrogas + Naturgy BAN (GBA)', x: W - 60, y: 360, role: 'demand' },
  { id: 'pampeana', label: 'Camuzzi Pampeana', x: W - 60, y: 440, role: 'demand' },
  { id: 'sur', label: 'Camuzzi Sur (Patagonia)', x: W - 60, y: 520, role: 'demand' },
  { id: 'chile', label: 'Export Chile', x: W - 60, y: 580, role: 'export' },
]

// ---------- LNG (intermediate nodes near demand) ----------
const LNG: NetworkNode[] = [
  { id: 'escobar', label: 'GNL Escobar', x: W - 260, y: 340, role: 'supply', note: 'regas estacional' },
  { id: 'bblanca', label: 'GNL Bahía Blanca', x: W - 260, y: 440, role: 'supply', note: 'regas estacional' },
]

export const NODES: NetworkNode[] = [...SUPPLY, ...DEMAND, ...LNG]

// ---------- edges: gasoductos ----------
export const EDGES: NetworkEdge[] = [
  // TGN
  { id: 'tgn_norte', label: 'Gasoducto Norte', operator: 'TGN', fromId: 'noa', toId: 'metrogas', flowKey: 'tgn_norte' },
  { id: 'tgn_centro_oeste', label: 'Centro Oeste', operator: 'TGN', fromId: 'neuquina', toId: 'metrogas', flowKey: 'tgn_centro_oeste', tramosKey: 'cco' },
  // TGS
  { id: 'tgs_neuba', label: 'Neuba I + II', operator: 'TGS', fromId: 'neuquina', toId: 'metrogas', flowKey: 'tgs_neuba', tramosKey: 'tgs_nqn' },
  { id: 'tgs_san_martin', label: 'Gral San Martín', operator: 'TGS', fromId: 'austral', toId: 'metrogas', flowKey: 'tgs_san_martin' },
  { id: 'tgs_san_martin_sj', label: '(ramal SJ)', operator: 'TGS', fromId: 'san_jorge', toId: 'metrogas', flowKey: 'tgs_san_martin' },
  // GPNK
  { id: 'gpnk', label: 'GPNK (Néstor Kirchner)', operator: 'GPNK', fromId: 'neuquina', toId: 'pampeana' },
  // Exports / imports
  { id: 'gas_andes', label: 'Gas Andes', operator: 'Otro', fromId: 'neuquina', toId: 'chile', tramosKey: 'gas_andes' },
  // LNG regas
  { id: 'escobar_gba', label: 'Regas Escobar', operator: 'Otro', fromId: 'escobar', toId: 'metrogas' },
  { id: 'bblanca_gba', label: 'Regas B.Blanca', operator: 'Otro', fromId: 'bblanca', toId: 'metrogas' },
  // Patagonia cordillerano
  { id: 'cordillerano', label: 'Cordillerano', operator: 'Otro', fromId: 'neuquina', toId: 'sur' },
]

export const VIEWBOX = { width: W, height: V }

// 4-tier color ramp ported from the gasoductos repo.
export function utilizationColor(util: number | null): string {
  if (util == null) return '#4b648b'
  if (util >= 1) return '#ff5f87'
  if (util >= 0.8) return '#ff9d4d'
  if (util >= 0.5) return '#ffe06d'
  return '#53e0a1'
}
