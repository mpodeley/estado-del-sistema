import { useMemo, useState } from 'react'
import {
  useDaily,
  useComments,
  useWeather,
  useDemandForecast,
  useWeatherRegions,
  useEnargasRDS,
  useSMNAlerts,
  useCammesaWeekly,
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
import ForecastPage from './components/ForecastPage'
import ColdRanking from './components/ColdRanking'
import EnargasRDSPanel from './components/EnargasRDSPanel'
import YearOverYearChart from './components/YearOverYearChart'
import HistoricalBandChart from './components/HistoricalBandChart'
import PulseCard from './components/PulseCard'
import LNGArrivalsChart from './components/LNGArrivalsChart'
import { ChartSkeleton, SkeletonBlock } from './components/Skeleton'
import { collectDates, demandYDomain, filterDatesByScale, type TimeScale } from './utils/charts'

type Page = 'outlook' | 'forecast' | 'guia' | 'fuentes' | 'status'

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const tabs: { id: Page; label: string }[] = [
    { id: 'outlook', label: 'Outlook' },
    { id: 'forecast', label: 'Forecast' },
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
  const smnState = useSMNAlerts()
  const cammesaWeeklyState = useCammesaWeekly()

  const [selectedCity, setSelectedCity] = useState('ba')
  const [scale, setScale] = useState<TimeScale>('all')

  // All hooks must run on every render — keep them above any early return,
  // otherwise React complains about "rendered more hooks than the previous
  // render" when loading flips from true to false.
  const data = dailyState.data ?? []
  const weatherForecast = weatherState.data?.forecast ?? []
  const demandFc = forecastState.data

  const valid = useMemo(() => data.filter((d) => d.demanda_total != null), [data])
  const allDates = useMemo(
    () => collectDates(data, demandFc?.forecast ?? [], weatherForecast),
    [data, demandFc, weatherForecast],
  )
  const visibleDates = useMemo(() => filterDatesByScale(allDates, scale), [allDates, scale])
  const demandY = useMemo(
    () => demandYDomain(valid, demandFc?.forecast ?? []),
    [valid, demandFc],
  )

  if (dailyState.loading) return <OutlookLoading />

  if (dailyState.error) {
    return (
      <div style={{ ...card, color: colors.status.err }}>
        No se pudo cargar daily.json: {dailyState.error.message}
      </div>
    )
  }

  const latest = valid[valid.length - 1]
  const comments = commentsState.data ?? { daily: [], weekly: [] }
  const regions = regionsState.data ?? []
  const rdsReports = (rdsState.data ?? []) as Parameters<typeof EnargasRDSPanel>[0]['reports']

  // Flatten CAMMESA weekly days from all published reports so the demand
  // chart can use their own usinas forecast where available.
  const cammesaDays: { fecha?: string; usinas?: number | null }[] = []
  for (const rep of (cammesaWeeklyState.data ?? []) as { days?: { fecha?: string; usinas?: number | null }[] }[]) {
    for (const d of rep.days ?? []) cammesaDays.push(d)
  }

  const freshness = [
    { label: 'Base', generatedAt: dailyState.meta.generated_at },
    { label: 'Clima', generatedAt: weatherState.meta.generated_at },
    { label: 'ENARGAS', generatedAt: rdsState.meta.generated_at },
    { label: 'Forecast', generatedAt: forecastState.meta.generated_at },
  ]

  return (
    <>
      <Header lastDate={latest?.fecha} freshness={freshness} />
      {smnState.data && smnState.data.length > 0 && (
        <div style={{
          marginTop: space.md,
          background: colors.status.err + '22',
          border: `1px solid ${colors.status.err}`,
          borderRadius: radius.md,
          padding: `${space.sm}px ${space.lg}px`,
          color: colors.status.err,
          fontSize: 13,
          fontWeight: 600,
        }}>
          ⚠ {smnState.data.length} alerta{smnState.data.length === 1 ? '' : 's'} meteorológica{smnState.data.length === 1 ? '' : 's'} activa{smnState.data.length === 1 ? '' : 's'} del SMN — ver pestaña Fuentes para detalle.
        </div>
      )}
      <KPICards latest={latest} />

      <PulseCard rows={rdsReports as never} />

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
          <FuelMixChart data={data} cammesaDays={cammesaDays} allDates={visibleDates} />
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
              Modelo: temp BA + día de semana sobre {demandFc.regression.n_points} días RDS.
              R² prioritaria {demandFc.regression.prioritaria.r2?.toFixed(2) ?? '?'} ·
              usinas {demandFc.regression.usinas?.r2?.toFixed(2) ?? '?'} ·
              total {demandFc.regression.demanda_total.r2?.toFixed(2) ?? '?'}
              {demandFc.regression.demanda_total.r2 != null &&
                demandFc.regression.demanda_total.r2 < 0.4 && (
                  <span style={{ color: colors.status.warn }}> — total indicativo.</span>
                )}
            </p>
          </div>
        )}
        <div style={card}>
          <h3 style={sectionTitle}>Demanda por sector (MMm³/día)</h3>
          <DemandChart
            data={valid}
            forecast={demandFc?.forecast ?? []}
            cammesaDays={cammesaDays}
            exportacionesBaseline={demandFc?.regression.baseline_exportaciones ?? undefined}
            allDates={visibleDates}
            yDomain={demandY}
          />
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
        {rdsReports.length > 0 && (
          <div style={card}>
            <h3 style={sectionTitle}>Próximos barcos GNL (MMm³/día programados)</h3>
            <LNGArrivalsChart rows={rdsReports as never} />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Volumen programado de regasificación por puerto. Fuente: ENARGAS RDS diario.
              Cargamentos son estacionales — concentrados en meses de invierno (mayo-agosto).
            </p>
          </div>
        )}
      </ChartGroup>

      {/* Grupo 4: Histórico — comparación vs años previos (rango + YoY). */}
      {rdsReports.length >= 60 && (
        <ChartGroup title="Histórico — año actual vs años previos">
          <div style={card}>
            <h3 style={sectionTitle}>Linepack — año actual vs rango histórico</h3>
            <HistoricalBandChart rows={rdsReports as never} field="linepack_total" unit="MMm³" />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Banda gris = min/max histórico por día del año. Línea azul = 2026. Si la línea
              sale del rango es una anomalía vs los años previos.
            </p>
          </div>
          <div style={card}>
            <h3 style={sectionTitle}>Linepack — años superpuestos</h3>
            <YearOverYearChart rows={rdsReports as never} field="linepack_total" unit="MMm³" />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Año actual con línea gruesa; años previos tenues para ver el patrón estacional.
            </p>
          </div>
          <div style={card}>
            <h3 style={sectionTitle}>Consumo total — año actual vs rango histórico</h3>
            <HistoricalBandChart rows={rdsReports as never} field="consumo_total_estimado" unit="MMm³/d" />
            <p style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
              Programa de consumo diario publicado por ENARGAS (planificado, no realizado).
            </p>
          </div>
          <div style={card}>
            <h3 style={sectionTitle}>Consumo total — años superpuestos</h3>
            <YearOverYearChart rows={rdsReports as never} field="consumo_total_estimado" unit="MMm³/d" />
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
        {page === 'forecast' && <ForecastPage />}
        {page === 'guia' && <GuidePage />}
        {page === 'fuentes' && <FuentesPage />}
        {page === 'status' && <StatusPage />}
      </div>
    </ErrorBoundary>
  )
}
