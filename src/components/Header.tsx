export default function Header({ lastDate }: { lastDate?: string }) {
  const formatted = lastDate
    ? new Date(lastDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '...'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>Estado del Sistema</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Red de transporte de gas - Argentina</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ color: '#64748b', fontSize: 12 }}>Ultimo dato</p>
        <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{formatted}</p>
      </div>
    </div>
  )
}
