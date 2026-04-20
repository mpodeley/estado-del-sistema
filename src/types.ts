export interface DailyRow {
  fecha: string
  demanda_total: number | null
  prioritaria: number | null
  industria: number | null
  usinas: number | null
  exportaciones: number | null
  iny_tgs: number | null
  iny_tgn: number | null
  iny_enarsa: number | null
  iny_gpm: number | null
  iny_bolivia: number | null
  iny_escobar: number | null
  iny_total: number | null
  linepack_tgs: number | null
  var_linepack_tgs: number | null
  lim_inf_tgs: number | null
  lim_sup_tgs: number | null
  linepack_tgn: number | null
  var_linepack_tgn: number | null
  lim_inf_tgn: number | null
  lim_sup_tgn: number | null
  linepack_total: number | null
  var_linepack_total: number | null
  lim_inf_total: number | null
  lim_sup_total: number | null
  temp_min_ba: number | null
  temp_max_ba: number | null
  temp_prom_ba: number | null
  temp_min_esquel: number | null
  temp_max_esquel: number | null
  temp_prom_esquel: number | null
  cammesa_gas: number | null
  cammesa_gasoil: number | null
  cammesa_fueloil: number | null
  cammesa_carbon: number | null
  cammesa_total: number | null
}

export interface Comments {
  daily: string[]
  weekly: string[]
  note?: string
}

export interface ForecastDay {
  fecha: string
  temp_max: number | null
  temp_min: number | null
  temp_prom: number | null
}

export interface WeatherPayload {
  forecast: ForecastDay[]
}

export interface RegionCity {
  id: string
  label: string
  lat: number
  lon: number
  region: string
  forecast: ForecastDay[]
}

export interface DemandForecastDay {
  fecha: string
  temp_prom: number | null
  prioritaria_est: number | null
  demanda_total_est: number | null
  usinas_est: number | null
}

export interface RegressionLine {
  slope: number | null
  intercept: number | null
  r2: number | null
}

export interface DemandForecast {
  forecast: DemandForecastDay[]
  regression: {
    n_points: number
    prioritaria: RegressionLine
    demanda_total: RegressionLine
  }
}

// Every JSON file produced by the pipeline is wrapped in this envelope.
export interface Envelope<T> {
  generated_at: string
  source: string | null
  source_date: string | null
  data: T
  [extra: string]: unknown
}

// Result shape returned by useJson.
export interface FetchState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  meta: { generated_at: string | null; source: string | null; source_date: string | null }
}
