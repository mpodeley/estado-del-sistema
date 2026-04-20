const items = [
  { task: 'Parser de Excel base con limpieza de datos', status: 'done', notes: 'parse_base_excel.py - filtra 0s como no-publicado, deduplica fechas' },
  { task: 'Parser de linepack equilibrio', status: 'done', notes: 'parse_linepack.py - TGN actual vs equilibrio' },
  { task: 'Dashboard React con KPIs y charts', status: 'done', notes: 'Recharts, dark theme, responsive, 4 KPI cards' },
  { task: 'Panel de estado por sistema (TGS/TGN)', status: 'done', notes: 'Ventana de 3 dias con estado NORMAL/BAJO/ALTO + limites' },
  { task: 'Comparacion semanal automatica', status: 'done', notes: 'Sem N vs N-1 para demanda, temp, inyecciones' },
  { task: 'Deploy a GitHub Pages', status: 'done', notes: 'gh-pages branch, mpodeley.github.io/estado-del-sistema' },
  { task: 'Scraper ENARGAS (PDF semanal)', status: 'done', notes: 'fetch_enargas.py + parse_enargas.py con pdfplumber' },
  { task: 'Scraper CAMMESA (PDF semanal)', status: 'done', notes: 'fetch_cammesa.py + parse_cammesa.py - extrae demanda, temp, inyecciones' },
  { task: 'Forecast de temperatura (14 dias)', status: 'done', notes: 'fetch_weather.py - Open-Meteo API, gratis, sin API key' },
  { task: 'Forecast automatico de demanda', status: 'done', notes: 'generate_forecast.py - regresion temp-demanda, R2=0.45 prioritaria' },
  { task: 'Comentarios operativos auto-generados', status: 'done', notes: 'Diario + semanal generados desde datos + forecast' },
  { task: 'Chart de forecast demanda real + estimada', status: 'done', notes: 'Lineas solidas (real) + punteadas (estimado) con marca Hoy' },
  { task: 'Chart de temperatura real + forecast', status: 'done', notes: 'Datos historicos + 14 dias Open-Meteo' },
  { task: 'GitHub Actions cron diario', status: 'done', notes: 'update-data.yml - 9 UTC diario + trigger manual' },
  { task: 'Pipeline orquestador', status: 'done', notes: 'build_data.py - fetch + parse + forecast + comments en secuencia' },
  { task: 'Pagina de fuentes de datos', status: 'done', notes: '9 fuentes listadas con URLs, frecuencia y estado' },
  { task: 'Pagina de estado del proyecto', status: 'done', notes: 'Esta pagina - checklist con progreso' },
  { task: 'Restricciones de transporte (Gas Andes, CCO)', status: 'pending', notes: 'Datos en sheet Datos cols CD-CI, parser pendiente' },
  { task: 'Inyeccion GNL y stock', status: 'pending', notes: 'Datos disponibles en Excel, integrar al dashboard' },
  { task: 'Datos de exportaciones CAMMESA', status: 'pending', notes: 'Fuente exacta por confirmar (volumen y destino)' },
  { task: 'Mejorar modelo de demanda', status: 'pending', notes: 'Mas datos historicos, variables adicionales (dia de semana, feriados)' },
  { task: 'Dominio custom (estadodelsistema.podeley.ar)', status: 'pending', notes: 'Configurar CNAME en GitHub Pages' },
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
