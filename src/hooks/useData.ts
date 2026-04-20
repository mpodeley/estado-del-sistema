import { useState, useEffect } from 'react'
import type { DailyRow, Comments } from '../types'

export function useDaily() {
  const [data, setData] = useState<DailyRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('./data/daily.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])
  return { data, loading }
}

export function useComments() {
  const [data, setData] = useState<Comments>({ daily: [], weekly: [] })
  useEffect(() => {
    fetch('./data/comments.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])
  return data
}

export interface ForecastDay {
  fecha: string
  temp_max: number | null
  temp_min: number | null
  temp_prom: number | null
}

export function useWeather() {
  const [data, setData] = useState<ForecastDay[]>([])
  useEffect(() => {
    fetch('./data/weather.json')
      .then(r => r.json())
      .then(d => setData(d.forecast || []))
      .catch(() => {})
  }, [])
  return data
}
