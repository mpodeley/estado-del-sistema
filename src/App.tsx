import { useDaily, useComments } from './hooks/useData'
import Header from './components/Header'
import KPICards from './components/KPICards'
import DemandChart from './components/DemandChart'
import LinepackChart from './components/LinepackChart'
import TemperatureChart from './components/TemperatureChart'
import InjectionsTable from './components/InjectionsTable'
import FuelMixChart from './components/FuelMixChart'
import CommentsSection from './components/CommentsSection'

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1400, margin: '0 auto', padding: '20px 16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: 20, marginTop: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' },
  loading: { textAlign: 'center' as const, padding: 80, fontSize: 18, color: '#94a3b8' },
}

export default function App() {
  const { data, loading } = useDaily()
  const comments = useComments()

  if (loading) return <div style={styles.loading}>Cargando datos...</div>

  const valid = data.filter(d => d.demanda_total != null)
  const latest = valid[valid.length - 1]

  return (
    <div style={styles.container}>
      <Header lastDate={latest?.fecha} />
      <KPICards latest={latest} />
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Demanda por sector (MMm3/dia)
          </h3>
          <DemandChart data={valid} />
        </div>
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Linepack TGS + TGN (MMm3)
          </h3>
          <LinepackChart data={valid} />
        </div>
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Temperatura Buenos Aires
          </h3>
          <TemperatureChart data={valid} />
        </div>
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Despacho electrico - Combustibles (GWh)
          </h3>
          <FuelMixChart data={data} />
        </div>
      </div>
      <div style={{ ...styles.grid, marginTop: 20 }}>
        <div style={styles.card}>
          <h3 style={{ marginBottom: 12, color: '#94a3b8', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
            Inyecciones por fuente (MMm3/dia)
          </h3>
          <InjectionsTable data={valid} />
        </div>
        <div style={styles.card}>
          <CommentsSection comments={comments} />
        </div>
      </div>
    </div>
  )
}
