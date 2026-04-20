/**
 * Shared chart-axis helpers so every time-series chart renders the same X range
 * (fechas) and, where units match, the same Y range. Charts stay independent —
 * they just receive common axis props instead of computing them individually.
 */

export interface ChartAxes {
  /** Every fecha (yyyy-mm-dd) present in any source, sorted ascending. */
  allDates: string[]
  /** Y domain shared by demand-related charts in MMm³/d. */
  demandYDomain: [number, number]
}

interface DateCarrier {
  fecha: string
}

/** Union + sort of every fecha across the provided series. */
export function collectDates(...series: DateCarrier[][]): string[] {
  const set = new Set<string>()
  for (const s of series) for (const r of s) set.add(r.fecha)
  return [...set].sort()
}

/**
 * Pad a series so it has one row per fecha in `allDates`. Missing rows are
 * filled with `{ fecha }` only — downstream chart library treats absent
 * numeric keys as null (no gap in axis).
 */
export function padToDates<T extends DateCarrier>(rows: T[], allDates: string[]): (T | DateCarrier)[] {
  const byDate = new Map(rows.map((r) => [r.fecha, r]))
  return allDates.map((d) => byDate.get(d) ?? { fecha: d })
}

/** Round up to the next multiple of `step` (for nicer Y-axis tops). */
function roundUp(n: number, step: number): number {
  return Math.ceil(n / step) * step
}

interface DemandInputs {
  demanda_total?: number | null
  prioritaria?: number | null
  industria?: number | null
  usinas?: number | null
  exportaciones?: number | null
}

/** Compute a Y-domain that fits every demand series we render. */
export function demandYDomain(
  historical: DemandInputs[],
  forecast: { demanda_total_est?: number | null }[],
): [number, number] {
  const historicalMax = Math.max(
    0,
    ...historical.flatMap((d) => [
      d.demanda_total ?? 0,
      // Stacked areas: the top is demanda_total; individual sectors are always ≤ total.
    ]),
  )
  const forecastMax = Math.max(0, ...forecast.map((f) => f.demanda_total_est ?? 0))
  const top = Math.max(historicalMax, forecastMax)
  return [0, top === 0 ? 10 : roundUp(top * 1.1, 10)]
}
