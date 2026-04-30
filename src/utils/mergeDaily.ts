import type { DailyRow, EnargasINGRow, EnargasRDSRow, ETGSRow } from '../types'
import type { CammesaPPORow } from '../hooks/useData'

// Fields the demand charts read from DailyRow that the auto-fed sources can
// also provide. When daily.json has null/missing for a date and a source has
// a value, we use that source's value so the historical series stays current
// (daily.json is the manual Excel — it lags 1–3 days behind public sources).
//
// We intentionally DO NOT overwrite daily.json values the analyst already
// filled in: if daily has a number, it wins. Sources only fill the holes.
//
// Source semantics may not be exactly identical to the Excel convention (e.g.
// iny_tgs in daily.json is "TGS inflow ex-ENARSA/GPM/import"; ING.tgs is the
// total throughput on the four TGS gasoductos including GPFM). For dates the
// Excel covers nothing wins; for tail dates the ING value is the best
// available signal even if the convention differs.

interface Sources {
  rds?: EnargasRDSRow[] | null
  ing?: EnargasINGRow[] | null
  etgs?: ETGSRow[] | null
  ppo?: CammesaPPORow[] | null
}

function blankDailyRow(fecha: string): DailyRow {
  return {
    fecha,
    demanda_total: null,
    prioritaria: null,
    industria: null,
    usinas: null,
    exportaciones: null,
    iny_tgs: null,
    iny_tgn: null,
    iny_enarsa: null,
    iny_gpm: null,
    iny_bolivia: null,
    iny_escobar: null,
    iny_total: null,
    linepack_tgs: null,
    var_linepack_tgs: null,
    lim_inf_tgs: null,
    lim_sup_tgs: null,
    linepack_tgn: null,
    var_linepack_tgn: null,
    lim_inf_tgn: null,
    lim_sup_tgn: null,
    linepack_total: null,
    var_linepack_total: null,
    lim_inf_total: null,
    lim_sup_total: null,
    temp_min_ba: null,
    temp_max_ba: null,
    temp_prom_ba: null,
    temp_min_esquel: null,
    temp_max_esquel: null,
    temp_prom_esquel: null,
    cammesa_gas: null,
    cammesa_gasoil: null,
    cammesa_fueloil: null,
    cammesa_carbon: null,
    cammesa_total: null,
  }
}

function fill<T>(current: T | null | undefined, candidate: T | null | undefined): T | null {
  if (current != null) return current
  return candidate ?? null
}

// Several daily.json fields (industria/usinas/exportaciones/iny_*/cammesa_*)
// carry 0.0 when the analyst left the row half-filled in the Excel — the
// parser's zero-as-null flag is off for those columns. Treat 0 as missing
// when we're deciding whether to fill from a public source; rows the analyst
// completed with real numbers will never be exactly 0 for these fields on a
// trading day.
function fillZero(current: number | null | undefined, candidate: number | null | undefined): number | null {
  if (current != null && current !== 0) return current
  return candidate ?? null
}

export function mergeDailyWithSources(daily: DailyRow[], sources: Sources): DailyRow[] {
  const byDate = new Map<string, DailyRow>()
  for (const d of daily) {
    if (d.fecha) byDate.set(d.fecha, { ...d })
  }

  // RDS — demand by sector + linepack_total + temperature.
  for (const r of sources.rds ?? []) {
    if (!r.fecha) continue
    const row = byDate.get(r.fecha) ?? blankDailyRow(r.fecha)

    const consumos = r.consumos ?? {}
    const exps = r.exportaciones ?? {}
    const expTotal = (() => {
      const tgn = exps.tgn?.vol_exportar
      const tgs = exps.tgs?.vol_exportar
      if (tgn == null && tgs == null) return null
      return (tgn ?? 0) + (tgs ?? 0)
    })()

    row.demanda_total = fill(row.demanda_total, r.consumo_total_estimado)
    row.prioritaria = fill(row.prioritaria, consumos.prioritaria?.programa)
    row.usinas = fillZero(row.usinas, consumos.cammesa?.programa)
    row.industria = fillZero(row.industria, consumos.industria?.programa)
    row.exportaciones = fillZero(row.exportaciones, expTotal)

    row.temp_prom_ba = fill(row.temp_prom_ba, r.temperatura_ba?.tm)
    row.temp_min_ba = fill(row.temp_min_ba, r.temperatura_ba?.min)
    row.temp_max_ba = fill(row.temp_max_ba, r.temperatura_ba?.max)

    row.linepack_total = fill(row.linepack_total, r.linepack_total)

    byDate.set(r.fecha, row)
  }

  // ING — per-gasoducto injection. Use only "R" (real) rows for historical
  // fill; "P" rows are programado and would falsely backfill future dates.
  for (const r of sources.ing ?? []) {
    if (!r.fecha || r.tipo !== 'R') continue
    const row = byDate.get(r.fecha) ?? blankDailyRow(r.fecha)
    row.iny_tgs = fillZero(row.iny_tgs, r.tgs)
    row.iny_tgn = fillZero(row.iny_tgn, r.tgn)
    row.iny_total = fillZero(row.iny_total, r.total)
    byDate.set(r.fecha, row)
  }

  // ETGS — real TGS linepack stock (the only source that has it).
  for (const r of sources.etgs ?? []) {
    if (!r.fecha) continue
    const row = byDate.get(r.fecha) ?? blankDailyRow(r.fecha)
    row.linepack_tgs = fill(row.linepack_tgs, r.linepack_tgs_dia_actual)
    row.var_linepack_tgs = fill(row.var_linepack_tgs, r.linepack_tgs_variacion)
    byDate.set(r.fecha, row)
  }

  // CAMMESA PPO — real fuel mix. cammesa_total in daily.json typically equals
  // gas (other fuels are negligible), so we mirror that.
  for (const r of sources.ppo ?? []) {
    if (!r.fecha) continue
    const row = byDate.get(r.fecha) ?? blankDailyRow(r.fecha)
    row.cammesa_gas = fillZero(row.cammesa_gas, r.gas_mmm3)
    row.cammesa_total = fillZero(row.cammesa_total, r.gas_mmm3)
    byDate.set(r.fecha, row)
  }

  return [...byDate.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Backward compatibility alias for callers that only had the RDS source.
export function mergeDailyWithRDS(daily: DailyRow[], rds: EnargasRDSRow[] | null): DailyRow[] {
  return mergeDailyWithSources(daily, { rds })
}
