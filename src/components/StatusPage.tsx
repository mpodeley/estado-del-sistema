const items = [
  { task: 'Parser de Excel base → daily.json', status: 'done', notes: 'parse_base_excel.py - 32 días de datos' },
  { task: 'Parser de linepack → linepack.json', status: 'done', notes: 'parse_linepack.py - 30 registros TGN' },
  { task: 'Dashboard React con KPIs y charts', status: 'done', notes: 'Recharts, dark theme, responsive' },
  { task: 'Panel de estado por sistema (TGS/TGN)', status: 'done', notes: 'Ventana de 3 días con estado NORMAL/BAJO/ALTO' },
  { task: 'Comparación semanal automática', status: 'done', notes: 'Sem N vs N-1 para demanda, temp, inyecciones' },
  { task: 'Deploy a GitHub Pages', status: 'done', notes: 'gh-pages branch, mpodeley.github.io/estado-del-sistema' },
  { task: 'Scraper ENARGAS (PDF semanal)', status: 'pending', notes: 'fetch_enargas.py + parse con pdfplumber' },
  { task: 'Scraper CAMMESA semanal/diario', status: 'pending', notes: 'fetch_cammesa.py + parse PDF' },
  { task: 'Scraper de temperatura (meteored)', status: 'pending', notes: 'fetch_weather.py + beautifulsoup' },
  { task: 'Forecast automático de demanda', status: 'pending', notes: 'Regresión temp→demanda prioritaria con datos históricos' },
  { task: 'Comentarios operativos auto-generados', status: 'pending', notes: 'Template con datos del día: temp, demanda, linepack, mantenimientos' },
  { task: 'GitHub Actions cron diario', status: 'pending', notes: 'Fetch → parse → commit JSONs → build → deploy' },
  { task: 'Datos de exportaciones CAMMESA', status: 'pending', notes: 'Fuente exacta por confirmar (volumen y destino)' },
  { task: 'Restricciones de transporte (Gas Andes, CCO)', status: 'pending', notes: 'Datos en sheet Datos cols CD-CI, parser pendiente' },
  { task: 'Inyección GNL y stock', status: 'pending', notes: 'Datos disponibles en Excel, integrar al dashboard' },
]

const icon = (s: string) => s === 'done' ? '✓' : '○'
const color = (s: string) => s === 'done' ? '#10b981' : '#64748b'

export default function StatusPage() {
  const done = items.filter(i => i.status === 'done').length
  const total = items.length
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Estado del proyecto</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
        {done}/{total} tareas completadas — {Math.round(done / total * 100)}% de avance
      </p>
      <div style={{ background: '#334155', borderRadius: 8, height: 8, marginBottom: 24 }}>
        <div style={{ background: '#10b981', borderRadius: 8, height: 8, width: `${done / total * 100}%` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(i => (
          <div key={i.task} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
            <span style={{ color: color(i.status), fontSize: 18, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{icon(i.status)}</span>
            <div>
              <p style={{ color: i.status === 'done' ? '#e2e8f0' : '#94a3b8', fontSize: 14, fontWeight: 500 }}>{i.task}</p>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{i.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
