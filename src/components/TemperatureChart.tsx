import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import type { DailyRow, ForecastDay, RegionCity } from '../types'
import { colors } from '../theme'
import { padToDates, formatTooltipDate } from '../utils/charts'

const fmt = (d: string) => d.slice(5)

interface Props {
  data: DailyRow[]
  forecast?: ForecastDay[]
  regions?: RegionCity[]
  selectedCityId?: string
  onSelectCity?: (id: string) => void
  allDates?: string[]
}

export default function TemperatureChart({
  data,
  forecast = [],
  regions,
  selectedCityId = 'ba',
  onSelectCity,
  allDates,
}: Props) {
  const city = regions?.find((r) => r.id === selectedCityId)

  const histKey = {
    ba: { min: 'temp_min_ba', max: 'temp_max_ba', prom: 'temp_prom_ba' },
    esquel: { min: 'temp_min_esquel', max: 'temp_max_esquel', prom: 'temp_prom_esquel' },
  }[selectedCityId as 'ba' | 'esquel']

  const { rows, lastHistorical, hasForecast } = useMemo(() => {
    const lastDate = data[data.length - 1]?.fecha ?? ''

    const byDate = new Map<string, {
      fecha: string
      temp_max_real?: number | null
      temp_prom_real?: number | null
      temp_min_real?: number | null
      temp_max_fc?: number | null
      temp_prom_fc?: number | null
      temp_min_fc?: number | null
    }>()

    if (histKey) {
      for (const d of data) {
        byDate.set(d.fecha, {
          fecha: d.fecha,
          temp_max_real: (d as never)[histKey.max] as number | null,
          temp_prom_real: (d as never)[histKey.prom] as number | null,
          temp_min_real: (d as never)[histKey.min] as number | null,
        })
      }
    }

    const fcSource: ForecastDay[] = city?.forecast ?? forecast
    let hasForecast = false
    for (const f of fcSource) {
      if (f.fecha <= lastDate) continue
      hasForecast = true
      const existing = byDate.get(f.fecha) ?? { fecha: f.fecha }
      byDate.set(f.fecha, {
        ...existing,
        temp_max_fc: f.temp_max,
        temp_prom_fc: f.temp_prom,
        temp_min_fc: f.temp_min,
      })
    }

    const merged = [...byDate.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const padded = allDates ? padToDates(merged, allDates) : merged
    return { rows: padded, lastHistorical: lastDate, hasForecast }
  }, [data, forecast, city, histKey, allDates])

  return (
    <div>
      {regions && regions.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ color: colors.textMuted, fontSize: 12 }}>Ciudad</label>
          <select
            value={selectedCityId}
            onChange={(e) => onSelectCity?.(e.target.value)}
            style={{
              background: colors.surface,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
            }}
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          {!histKey && (
            <span style={{ color: colors.textDim, fontSize: 11 }}>
              (solo forecast — sin serie histórica local)
            </span>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} syncId="outlook">
          <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="°" />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            labelFormatter={formatTooltipDate}
            formatter={(v: number) => (v != null ? `${v}°C` : '-')}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {hasForecast && lastHistorical && (
            <ReferenceLine x={lastHistorical} stroke="#64748b" strokeDasharray="3 3" label={{ value: 'Hoy', fill: '#64748b', fontSize: 10 }} />
          )}
          <Line type="monotone" dataKey="temp_max_real" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Max real" connectNulls />
          <Line type="monotone" dataKey="temp_prom_real" stroke="#f59e0b" strokeWidth={2} dot={false} name="Prom real" connectNulls />
          <Line type="monotone" dataKey="temp_min_real" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Min real" connectNulls />
          <Line type="monotone" dataKey="temp_max_fc" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Max forecast" connectNulls={false} />
          <Line type="monotone" dataKey="temp_prom_fc" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prom forecast" connectNulls={false} />
          <Line type="monotone" dataKey="temp_min_fc" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Min forecast" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
