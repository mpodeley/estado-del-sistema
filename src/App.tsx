import { useState } from 'react'
import {
  useDaily,
  useComments,
  useWeather,
  useDemandForecast,
  useWeatherRegions,
  useEnargasRDS,
} from './hooks/useData'
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
import InjectionsChart from './components/InjectionsChart'
import InjectionsTable from './components/InjectionsTable'
import WeeklyComparison from './components/WeeklyComparison'
import CommentsSection from './components/CommentsSection'
import FuentesPage from './components/FuentesPage'
import StatusPage from './components/StatusPage'
import GuidePage from './components/GuidePage'
import ColdRanking from './components/ColdRanking'
import EnargasRDSPanel from './components/EnargasRDSPanel'
import YearOverYearChart from './components/YearOverYearChart'
import { ChartSkeleton, SkeletonBlock } from './components/Skeleton'
import { collectDates, demandYDomain, filterDatesByScale, type TimeScale } from './utils/charts'

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
      <ChartSkeleton height={360} />
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
  const [scale, setScale] = useState<TimeScale>('all')

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

  // Shared X range across every chart so the user can scan them in parallel;
  // the time-scale selector then narrows this down to the desired window.
  const allDates = collectDates(data, demandFc?.forecast ?? [], weatherForecast)
  const visibleDates = filterDatesByScale(allDates, scale)
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

      {/* Panels row: estado por sistema, comparación semanal, frío regional. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
        {regions.length > 0 && (
          <div style={{ ...card, borderTop: `3px solid ${colors.accent.purple}` }}>
            <ColdRanking cities={regions} />
          </div>
        )}
      </div>

      {/* Selector de escala temporal para todos los charts. */}
      <ScaleSelector value={scale} onChange={setScale} />

      {/* Grupo 1: Drivers — qué mueve la demanda de gas. */}
      <ChartGroup title="Drivers — clima y generación eléctrica">
        <div style={card}>
          <h3 style={sectionTitle}>Temperatura (real + forecast)</h3>
          <TemperatureChart
            data={valid}
            forecast={weatherForecast}
            regions={regions}
            selectedCityId={selectedCity}
            onSelectCity={setSelectedCity}
            allDates={visibleDates}
          />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Despacho eléctrico — Combustibles</h3>
          <FuelMixChart data={data} allDates={visibleDates} />
        </div>
      </ChartGroup>

      {/* Grupo 2: Demanda — consumo de gas. */}
      <ChartGroup title="Demanda de gas">
        {demandFc && demandFc.forecast.length > 0 && (
          <div style={card}>
            <h3 style={sectionTitle}>Forecast de demanda (real + estimada)</h3>
            <DemandForecastChart
              data={valid}
              forecast={demandFc.forecast}
              allDates={visibleDates}
              yDomain={demandY}
            />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Regresión lineal temp-demanda ({demandFc.regression.n_points} datos, R² prioritaria:{' '}
              {demandFc.regression.prioritaria.r2?.toFixed(2) ?? '?'})
              {demandFc.regression.demanda_total.r2 != null &&
                demandFc.regression.demanda_total.r2 < 0.3 && (
                  <span style={{ color: colors.status.warn }}> — indicativo, R² total bajo.</span>
                )}
            </p>
          </div>
        )}
        <div style={card}>
          <h3 style={sectionTitle}>Demanda por sector (MMm³/día)</h3>
          <DemandChart data={valid} allDates={visibleDates} yDomain={demandY} />
        </div>
      </ChartGroup>

      {/* Grupo 3: Oferta + estado del sistema. */}
      <ChartGroup title="Oferta + estado del sistema">
        <div style={card}>
          <h3 style={sectionTitle}>Inyecciones por fuente (MMm³/día)</h3>
          <InjectionsChart data={valid} allDates={visibleDates} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Linepack TGS + TGN (MMm³)</h3>
          <LinepackChart data={valid} allDates={visibleDates} />
        </div>
      </ChartGroup>

      {/* Grupo 4: Histórico — comparación año-sobre-año usando RDS backfilleado. */}
      {rdsReports.length >= 60 && (
        <ChartGroup title="Histórico — comparación año-sobre-año">
          <div style={card}>
            <h3 style={sectionTitle}>Linepack total (MMm³) — año actual vs previos</h3>
            <YearOverYearChart rows={rdsReports as never} field="linepack_total" unit="MMm³" />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Fuente: ENARGAS RDS diario. Año actual con línea gruesa; años previos más tenues para
              ver el patrón estacional.
            </p>
          </div>
          <div style={card}>
            <h3 style={sectionTitle}>Consumo total estimado (MMm³/d) — histórico</h3>
            <YearOverYearChart rows={rdsReports as never} field="consumo_total_estimado" unit="MMm³/d" />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Programa de consumo diario publicado por ENARGAS. Ojo: es planificado, no realizado.
            </p>
          </div>
        </ChartGroup>
      )}

      <div style={{ ...card, marginTop: space.xl }}>
        <h3 style={sectionTitle}>Tabla de inyecciones — últimos días</h3>
        <InjectionsTable data={valid} />
      </div>
    </>
  )
}

function ScaleSelector({ value, onChange }: { value: TimeScale; onChange: (v: TimeScale) => void }) {
  const options: { id: TimeScale; label: string }[] = [
    { id: '7d', label: '7d + forecast' },
    { id: '30d', label: '30d + forecast' },
    { id: '90d', label: '90d' },
    { id: 'all', label: 'Todo' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginTop: space.xl,
        padding: 4,
        background: colors.surface,
        borderRadius: radius.md,
        width: 'fit-content',
      }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            background: value === o.id ? colors.border : 'transparent',
            color: value === o.id ? colors.textPrimary : colors.textDim,
            border: 'none',
            borderRadius: radius.sm,
            padding: `${space.xs + 2}px ${space.md}px`,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ChartGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: space.xl }}>
      <h2
        style={{
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: space.md,
          paddingLeft: space.xs,
          borderLeft: `3px solid ${colors.accent.blue}`,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
          gap: space.lg,
        }}
      >
        {children}
      </div>
    </section>
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
