const fuentes = [
  { name: 'ENARGAS - Proyección semanal', url: 'https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-proyeccion-semanal.php', freq: 'Semanal (viernes)', status: 'pendiente', desc: 'PDF con demanda, inyecciones, linepack, temperatura proyectada' },
  { name: 'CAMMESA - Programación semanal', url: 'https://cammesaweb.cammesa.com/programacion-semanal/', freq: 'Semanal', status: 'pendiente', desc: 'PDF con forecast de demanda eléctrica y despacho de gas a usinas' },
  { name: 'CAMMESA - Programación diaria', url: 'https://cammesaweb.cammesa.com/programacion-diaria/', freq: 'Diaria', status: 'pendiente', desc: 'Despacho diario de combustibles para generación eléctrica' },
  { name: 'CAMMESA - Resultados de operaciones', url: 'https://cammesaweb.cammesa.com/reportes-resultados-de-operaciones/', freq: 'Diaria (cierre)', status: 'pendiente', desc: 'Datos cerrados reales de despacho y generación' },
  { name: 'Meteored Argentina', url: 'https://www.meteored.com.ar/', freq: 'Continua', status: 'pendiente', desc: 'Pronóstico 14 días - temperatura para estimar demanda prioritaria' },
  { name: 'Tiempo3 - Clima histórico', url: 'https://www.tiempo3.com/south-america/argentina', freq: 'Diaria', status: 'pendiente', desc: 'Temperatura real histórica para calibración del modelo' },
  { name: 'CAMMESA - Exportaciones', url: '#', freq: 'Por definir', status: 'pendiente', desc: 'Volumen y destino de exportaciones de gas - fuente exacta por confirmar' },
  { name: 'Excel Base Reporte', url: '#', freq: 'Manual', status: 'activa', desc: 'Base Reporte Estado de Sistema.xlsx - fuente actual de datos históricos' },
  { name: 'ENARGAS - Linepack equilibrio', url: '#', freq: 'Manual', status: 'activa', desc: 'Excel de linepack con equilibrio y desbalance TGN' },
]

const badge = (s: string) => ({
  background: s === 'activa' ? '#10b98122' : '#f59e0b22',
  color: s === 'activa' ? '#10b981' : '#f59e0b',
  padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 as const,
})

export default function FuentesPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Fuentes de datos</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Origen de los datos que alimentan el dashboard</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fuentes.map(f => (
          <div key={f.name} style={{ background: '#1e293b', borderRadius: 10, padding: '16px 20px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h4 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{f.name}</h4>
                <span style={badge(f.status)}>{f.status.toUpperCase()}</span>
              </div>
              <span style={{ color: '#64748b', fontSize: 12 }}>{f.freq}</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{f.desc}</p>
            {f.url !== '#' && (
              <a href={f.url} target="_blank" rel="noopener" style={{ color: '#3b82f6', fontSize: 12 }}>{f.url}</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
