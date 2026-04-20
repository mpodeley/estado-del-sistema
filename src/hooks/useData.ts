import { useEffect, useState } from 'react'
import type {
  Comments,
  DailyRow,
  DemandForecast,
  Envelope,
  FetchState,
  RegionCity,
  WeatherPayload,
} from '../types'

// Re-exported so components that historically imported from this file still work.
export type { ForecastDay, DemandForecastDay, DemandForecast } from '../types'

/**
 * Loads a JSON file from /public/data/ and unwraps the {generated_at, data}
 * envelope produced by the Python pipeline. Legacy payloads (no envelope) are
 * returned as-is.
 */
export function useJson<T>(path: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    meta: { generated_at: null, source: null, source_date: null },
  })

  useEffect(() => {
    let cancelled = false
    fetch(path, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${path}`)
        return r.json()
      })
      .then((raw: unknown) => {
        if (cancelled) return
        if (raw && typeof raw === 'object' && 'data' in raw && 'generated_at' in raw) {
          const env = raw as Envelope<T>
          setState({
            data: env.data,
            loading: false,
            error: null,
            meta: {
              generated_at: env.generated_at ?? null,
              source: env.source ?? null,
              source_date: env.source_date ?? null,
            },
          })
        } else {
          setState({
            data: raw as T,
            loading: false,
            error: null,
            meta: { generated_at: null, source: null, source_date: null },
          })
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err }))
      })
    return () => {
      cancelled = true
    }
  }, [path])

  return state
}

// One wrapper per dataset — gives each a clear name + typed payload.
export const useDaily = () => useJson<DailyRow[]>('./data/daily.json')
export const useComments = () => useJson<Comments>('./data/comments.json')
export const useWeather = () => useJson<WeatherPayload>('./data/weather.json')
export const useDemandForecast = () => useJson<DemandForecast>('./data/demand_forecast.json')
export const useWeatherRegions = () => useJson<RegionCity[]>('./data/weather_regions.json')
export const useEnargasRDS = () => useJson<unknown[]>('./data/enargas.json')
export const useSMNAlerts = () => useJson<unknown[]>('./data/smn_alerts.json')
export const useCammesaWeekly = () => useJson<unknown[]>('./data/cammesa_weekly.json')
export interface CammesaPPORow {
  fecha: string
  gas_mmm3: number | null
  gasoil_m3: number | null
  fueloil_tn: number | null
  carbon_tn: number | null
  gen_gas_mwh?: number | null
  plants_counted?: number
  source?: string
}
export const useCammesaPPO = () => useJson<CammesaPPORow[]>('./data/cammesa_ppo.json')

export interface BacktestPoint {
  fecha: string
  actual: number | null
  predicted: number | null
}

export interface BacktestSegment {
  metrics: { mae: number | null; mape: number | null; n: number }
  series: BacktestPoint[]
}

export interface ForecastBacktest {
  test_days: number
  train_days: number
  segments: Record<string, BacktestSegment>
}

export const useForecastBacktest = () => useJson<ForecastBacktest>('./data/forecast_backtest.json')

export interface MEGSABenchmark {
  product: string
  productName: string
  units: string
  currentPrice: number
  previousPrice: number | null
  nominalDifference: number | null
  percentageDifference: number | null
  currentPeriod: string
  displayName: string
  marketType?: string
}

export interface MEGSARonda {
  id: number
  descripcion: string
  publicaDesde: string
  fechaUltimaModificacion: string
}

export interface MEGSAPayload {
  benchmarks: MEGSABenchmark[]
  dolar: { currentPrice?: number; previousPrice?: number | null; percentageDifference?: number | null; lastUpdated?: string } | null
  rondas: MEGSARonda[]
  fetched_at: string
}

export const useMEGSA = () => useJson<MEGSAPayload>('./data/megsa.json')

export interface TramoRow {
  fecha: string
  gas_andes_autorizacion: number | null
  cco_capacidad: number | null
  cco_corte: number | null
  tgs_nqn_capacidad: number | null
  tgs_nqn_corte: number | null
}
export const useTramos = () => useJson<TramoRow[]>('./data/tramos.json')

export interface GasoductoRow {
  fecha: string
  tgn_centro_oeste: number | null
  tgn_norte: number | null
  tgn_otros: number | null
  tgs_neuba: number | null
  tgs_san_martin: number | null
  tgs_otros: number | null
  distr_malargue: number | null
  distr_sur: number | null
  distr_otros: number | null
  total: number | null
}
export interface CuencaRow {
  fecha: string
  tgn_neuquina: number | null
  tgn_noroeste: number | null
  tgn_otros: number | null
  tgs_neuquina: number | null
  tgs_san_jorge: number | null
  tgs_austral: number | null
  tgs_otros: number | null
  distribuidoras_propios: number | null
  otros_origenes: number | null
  total: number | null
}
export interface EnargasMonthly {
  gas_recibido?: { cuenca: CuencaRow[]; gasoducto: GasoductoRow[] }
  contratos_firme?: Record<string, number | string>[]
}
export const useEnargasMonthly = () => useJson<EnargasMonthly>('./data/enargas_monthly.json')
