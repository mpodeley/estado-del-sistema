import { useState } from 'react'
import { useDaily, useComments, useWeather, useDemandForecast, useWeatherRegions, useEnargasRDS } from './hooks/useData'
import { card, colors, radius, sectionTitle, space } from './theme'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import KPICards from './components/KPICards'
import SystemPanel from './components/SystemPanel'
import DemandChart from './components/DemandChart'
import DemandForecastChart from './components/DemandForecastChart'
import LinepackChart from './components/LinepackChart'
import TemperatureChart from './components/TemperatureChart'
import FuelMixChart from './components/FuelMixChart'
import InjectionsTable from './components/InjectionsTable'
import WeeklyComparison from './components/WeeklyComparison'
import CommentsSection from './components/CommentsSection'
import FuentesPage from './components/FuentesPage'
import StatusPage from './components/StatusPage'
import GuidePage from './components/GuidePage'
import RegionalMap from './components/RegionalMap'
import ColdRanking from './components/ColdRanking'
import EnargasRDSPanel from './components/EnargasRDSPanel'
import { ChartSkeleton, SkeletonBlock } from './components/Skeleton'
import { collectDates, demandYDomain } from './utils/charts'

type Page = 'outlook' | 'guia' | 'fuentes' | 'status'

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const tabs: { id: Page; label: string }[] = [
    { id: 'outlook', label: 'Outlook' },
    { id: 'guia', label: 'Guía' },
    { id: 'fuentes', label: 'Fuentes' },
    { id: 'status', label: 'Estado' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: space.xl,
        background: colors.surface,
        borderRadius: radius.md,
        padding: 4,
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setPage(t.id)}
          style={{
            background: page === t.id ? colors.border : 'transparent',
            color: page === t.id ? colors.textPrimary : colors.textDim,
            border: 'none',
            borderRadius: radius.sm,
            padding: `${space.sm}px ${space.xl}px`,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function OutlookLoading() {
  return (
    <>
      <SkeletonBlock height={64} style={{ marginBottom: space.lg }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: space.md,
          marginBottom: space.lg,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} height={100} />
        ))}
      </div>
      <SkeletonBlock height={120} style={{ marginBottom: space.lg }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: space.lg,
        }}
      >
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </>
  )
}

function OutlookPage() {
  const dailyState = useDaily()
  const commentsState = useComments()
  const weatherState = useWeather()
  const forecastState = useDemandForecast()
  const regionsState = useWeatherRegions()
  const rdsState = useEnargasRDS()

  const [selectedCity, setSelectedCity] = useState('ba')
  const [mapDay, setMapDay] = useState(0)

  if (dailyState.loading) return <OutlookLoading />

  if (dailyState.error) {
    return (
      <div style={{ ...card, color: colors.status.err }}>
        No se pudo cargar daily.json: {dailyState.error.message}
      </div>
    )
  }

  const data = dailyState.data ?? []
  const valid = data.filter((d) => d.demanda_total != null)
  const latest = valid[valid.length - 1]

  const comments = commentsState.data ?? { daily: [], weekly: [] }
  const weatherForecast = weatherState.data?.forecast ?? []
  const demandFc = forecastState.data
  const regions = regionsState.data ?? []
  const rdsReports = (rdsState.data ?? []) as Parameters<typeof EnargasRDSPanel>[0]['reports']

  // Shared axes across every time-series chart so users can scan them in
  // parallel. X = union of all fechas (history + forecast). Y for demand
  // charts = auto-computed top based on historical + forecast.
  const allDates = collectDates(data, demandFc?.forecast ?? [], weatherForecast)
  const demandY = demandYDomain(valid, demandFc?.forecast ?? [])

  const freshness = [
    { label: 'Base', generatedAt: dailyState.meta.generated_at },
    { label: 'Clima', generatedAt: weatherState.meta.generated_at },
    { label: 'ENARGAS', generatedAt: rdsState.meta.generated_at },
    { label: 'Forecast', generatedAt: forecastState.meta.generated_at },
  ]

  return (
    <>
      <Header lastDate={latest?.fecha} freshness={freshness} />
      <KPICards latest={latest} />

      <div style={{ ...card, marginTop: space.xl }}>
        <CommentsSection comments={comments} />
      </div>

      {rdsReports.length > 0 && (
        <div style={{ ...card, marginTop: space.xl, borderTop: `3px solid ${colors.accent.blue}` }}>
          <EnargasRDSPanel reports={rdsReports} />
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: space.lg,
          marginTop: space.xl,
        }}
      >
        <SystemPanel
          title="Sistema TGS"
          color={colors.accent.green}
          data={valid}
          linepackKey="linepack_tgs"
          varKey="var_linepack_tgs"
          limInfKey="lim_inf_tgs"
          limSupKey="lim_sup_tgs"
        />
        <SystemPanel
          title="Sistema TGN"
          color={colors.accent.blue}
          data={valid}
          linepackKey="linepack_tgn"
          varKey="var_linepack_tgn"
          limInfKey="lim_inf_tgn"
          limSupKey="lim_sup_tgn"
        />
        <div style={{ ...card, borderTop: `3px solid ${colors.accent.orange}` }}>
          <WeeklyComparison data={valid} />
        </div>
      </div>

      {demandFc && demandFc.forecast.length > 0 && (
        <div style={{ ...card, marginTop: space.xl }}>
          <h3 style={sectionTitle}>Forecast de demanda (real + estimada por temperatura)</h3>
          <DemandForecastChart
            data={valid}
            forecast={demandFc.forecast}
            allDates={allDates}
            yDomain={demandY}
          />
          <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
            Estimado via regresión lineal temp-demanda ({demandFc.regression.n_points} datos históricos,
            R² prioritaria: {demandFc.regression.prioritaria.r2?.toFixed(2) ?? '?'})
            {demandFc.regression.demanda_total.r2 != null &&
              demandFc.regression.demanda_total.r2 < 0.3 && (
                <span style={{ color: colors.status.warn }}>
                  {' '}— R² bajo para demanda total: tomá el forecast como indicativo.
                </span>
              )}
          </p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: space.lg,
          marginTop: space.xl,
        }}
      >
        <div style={card}>
          <h3 style={sectionTitle}>Demanda por sector (MMm3/día)</h3>
          <DemandChart data={valid} allDates={allDates} yDomain={demandY} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Linepack TGS + TGN (MMm3)</h3>
          <LinepackChart data={valid} allDates={allDates} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Temperatura (real + forecast)</h3>
          <TemperatureChart
            data={valid}
            forecast={weatherForecast}
            regions={regions}
            selectedCityId={selectedCity}
            onSelectCity={setSelectedCity}
            allDates={allDates}
          />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Despacho eléctrico - Combustibles</h3>
          <FuelMixChart data={data} allDates={allDates} />
        </div>
      </div>

      {regions.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: space.lg,
            marginTop: space.xl,
          }}
        >
          <div style={{ ...card, gridColumn: 'span 2', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: space.sm,
                marginBottom: space.sm,
              }}
            >
              <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Mapa regional de temperaturas + gasoductos</h3>
              <MapDayPicker value={mapDay} cities={regions} onChange={setMapDay} />
            </div>
            <RegionalMap cities={regions} dayIndex={mapDay} onSelectCity={setSelectedCity} />
          </div>
          <div style={card}>
            <ColdRanking cities={regions} />
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: space.xl }}>
        <h3 style={sectionTitle}>Inyecciones por fuente (MMm3/día)</h3>
        <InjectionsTable data={valid} />
      </div>
    </>
  )
}

function MapDayPicker({
  value,
  cities,
  onChange,
}: {
  value: number
  cities: { forecast: { fecha: string }[] }[]
  onChange: (v: number) => void
}) {
  const dates = cities[0]?.forecast ?? []
  if (dates.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
      <label style={{ color: colors.textMuted, fontSize: 12 }}>Día</label>
      <input
        type="range"
        min={0}
        max={dates.length - 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 160 }}
      />
      <span style={{ color: colors.textSecondary, fontSize: 12, minWidth: 60, textAlign: 'right' }}>
        {dates[value]?.fecha.slice(5) ?? ''}
      </span>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('outlook')

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space.xl}px ${space.lg}px` }}>
        <Nav page={page} setPage={setPage} />
        {page === 'outlook' && <OutlookPage />}
        {page === 'guia' && <GuidePage />}
        {page === 'fuentes' && <FuentesPage />}
        {page === 'status' && <StatusPage />}
      </div>
    </ErrorBoundary>
  )
}
