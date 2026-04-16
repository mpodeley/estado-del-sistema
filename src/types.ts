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
}
