import { useState } from 'react'
import { useDaily, useComments, useWeather } from './hooks/useData'
import Header from './components/Header'
import KPICards from './components/KPICards'
import SystemPanel from './components/SystemPanel'
import DemandChart from './components/DemandChart'
import LinepackChart from './components/LinepackChart'
import TemperatureChart from './components/TemperatureChart'
import FuelMixChart from './components/FuelMixChart'
import InjectionsTable from './components/InjectionsTable'
import WeeklyComparison from './components/WeeklyComparison'
import CommentsSection from './components/CommentsSection'
import FuentesPage from './components/FuentesPage'
import StatusPage from './components/StatusPage'

type Page = 'outlook' | 'fuentes' | 'status'

const card: React.CSSProperties = { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }
const sectionTitle: React.CSSProperties = { marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const tabs: { id: Page; label: string }[] = [
    { id: 'outlook', label: 'Outlook' },
    { id: 'fuentes', label: 'Fuentes' },
    { id: 'status', label: 'Estado' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#1e293b', borderRadius: 8, padding: 4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{
          background: page === t.id ? '#334155' : 'transparent',
          color: page === t.id ? '#f1f5f9' : '#64748b',
          border: 'none', borderRadius: 6, padding: '8px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function OutlookPage() {
  const { data, loading } = useDaily()
  const comments = useComments()
  const forecast = useWeather()

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>Cargando datos...</div>

  const valid = data.filter(d => d.demanda_total != null)
  const latest = valid[valid.length - 1]

  return (
    <>
      <Header lastDate={latest?.fecha} />
      <KPICards latest={latest} />

      {/* Comentarios operativos */}
      <div style={{ ...card, marginTop: 20 }}>
        <CommentsSection comments={comments} />
      </div>

      {/* Paneles de estado por sistema */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 20 }}>
        <SystemPanel title="Sistema TGS" color="#10b981" data={valid}
          linepackKey="linepack_tgs" varKey="var_linepack_tgs"
          limInfKey="lim_inf_tgs" limSupKey="lim_sup_tgs" />
        <SystemPanel title="Sistema TGN" color="#3b82f6" data={valid}
          linepackKey="linepack_tgn" varKey="var_linepack_tgn"
          limInfKey="lim_inf_tgn" limSupKey="lim_sup_tgn" />
        <div style={{ ...card, borderTop: '3px solid #f59e0b' }}>
          <WeeklyComparison data={valid} />
        </div>
      </div>

      {/* Charts de soporte */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 16, marginTop: 20 }}>
        <div style={card}>
          <h3 style={sectionTitle}>Demanda por sector (MMm3/dia)</h3>
          <DemandChart data={valid} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Linepack TGS + TGN (MMm3)</h3>
          <LinepackChart data={valid} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Temperatura Buenos Aires (real + forecast)</h3>
          <TemperatureChart data={valid} forecast={forecast} />
        </div>
        <div style={card}>
          <h3 style={sectionTitle}>Despacho electrico - Combustibles</h3>
          <FuelMixChart data={data} />
        </div>
      </div>

      {/* Tabla de inyecciones */}
      <div style={{ ...card, marginTop: 20 }}>
        <h3 style={sectionTitle}>Inyecciones por fuente (MMm3/dia)</h3>
        <InjectionsTable data={valid} />
      </div>
    </>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>('outlook')

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px' }}>
      <Nav page={page} setPage={setPage} />
      {page === 'outlook' && <OutlookPage />}
      {page === 'fuentes' && <FuentesPage />}
      {page === 'status' && <StatusPage />}
    </div>
  )
}
