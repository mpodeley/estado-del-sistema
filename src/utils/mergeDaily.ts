import type { DailyRow, EnargasRDSRow } from '../types'

// Fields the demand charts read from DailyRow that the RDS can also provide.
// When daily.json has null/missing for a date and the RDS has a value, we use
// the RDS value so the historical series stays current (daily.json is the
// manual Excel — it lags 1–3 days behind the RDS).
//
// We intentionally DO NOT overwrite daily.json values the analyst already
// filled in: if daily has a number, it wins. RDS only fills the holes.

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

// Some daily.json sector fields (industria/usinas/exportaciones) carry 0.0
// when the analyst left the row half-filled in the Excel — the parser's
// zero-as-null flag is off for those columns. Treat 0 as missing when we're
// deciding whether to fill from the RDS; historical rows the analyst
// completed with real numbers will never be exactly 0 for these sectors.
function fillZeroAsMissing(current: number | null | undefined, candidate: number | null | undefined): number | null {
  if (current != null && current !== 0) return current
  return candidate ?? null
}

export function mergeDailyWithRDS(daily: DailyRow[], rds: EnargasRDSRow[] | null): DailyRow[] {
  if (!rds || rds.length === 0) return daily

  const byDate = new Map<string, DailyRow>()
  for (const d of daily) {
    if (d.fecha) byDate.set(d.fecha, { ...d })
  }

  for (const r of rds) {
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
    // daily.json calls power-generation demand "usinas"; RDS calls it cammesa.
    // These three fields keep 0.0 in the Excel when a row is half-filled, so
    // treat 0 as fill-able against the RDS value.
    row.usinas = fillZeroAsMissing(row.usinas, consumos.cammesa?.programa)
    row.industria = fillZeroAsMissing(row.industria, consumos.industria?.programa)
    row.exportaciones = fillZeroAsMissing(row.exportaciones, expTotal)

    // Temperature: daily already carries this for the common dates, but fill
    // the holes too — useful when someone drops a new RDS before updating the
    // Excel.
    row.temp_prom_ba = fill(row.temp_prom_ba, r.temperatura_ba?.tm)
    row.temp_min_ba = fill(row.temp_min_ba, r.temperatura_ba?.min)
    row.temp_max_ba = fill(row.temp_max_ba, r.temperatura_ba?.max)

    row.linepack_total = fill(row.linepack_total, r.linepack_total)

    byDate.set(r.fecha, row)
  }

  return [...byDate.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}
