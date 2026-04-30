import { useETGS } from '../hooks/useData'
import { card, colors, sectionTitle, space } from '../theme'

// Real TGS state from the daily ETGS email-fed report. Shows the only
// publicly-non-available data we have: absolute TGS linepack (stock) plus
// TGS's own operational alert banner.
export default function TGSPanel() {
  const { data } = useETGS()
  const rows = data ?? []
  if (rows.length === 0) return null
  const latest = rows[rows.length - 1]
  const lp = latest.linepack_tgs_dia_actual
  const variacion = latest.linepack_tgs_variacion
  const motivo = latest.alerta_motivo

  // Color-code by motivo keywords; the report itself doesn't expose a level.
  const lowMotivo = (motivo ?? '').toLowerCase()
  const alertColor = lowMotivo.includes('bajo')
    ? colors.status.err
    : lowMotivo.includes('alto')
      ? colors.accent.orange
      : colors.status.ok

  const recepCuencaSur = latest.recepcion_sur_realizada
  const recepCuencaNeuq = latest.recepcion_neuquina_realizada
  const totalRealizado = (recepCuencaSur ?? 0) + (recepCuencaNeuq ?? 0)

  return (
    <div style={{ ...card, borderTop: `3px solid ${colors.accent.green}`, marginTop: space.xl }}>
      <h3 style={sectionTitle}>
        TGS — Síntesis operativa{' '}
        <span style={{ color: colors.textDim, fontSize: 11, fontWeight: 400, textTransform: 'none', float: 'right' }}>
          {latest.fecha} · fuente: ETGS
        </span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space.md, marginTop: space.sm }}>
        <Stat label="Linepack TGS" value={lp != null ? `${lp.toFixed(2)} MMm³` : '—'} sub={variacion != null ? `${variacion >= 0 ? '+' : ''}${variacion.toFixed(2)} vs anterior` : undefined} />
        <Stat label="Recepción Cuenca Sur" value={recepCuencaSur != null ? `${recepCuencaSur.toFixed(2)} MMm³/d` : '—'} sub={latest.recepcion_sur_programada != null ? `prog: ${latest.recepcion_sur_programada.toFixed(2)}` : undefined} />
        <Stat label="Recepción Neuquina" value={recepCuencaNeuq != null ? `${recepCuencaNeuq.toFixed(2)} MMm³/d` : '—'} sub={latest.recepcion_neuquina_programada != null ? `prog: ${latest.recepcion_neuquina_programada.toFixed(2)}` : undefined} />
        <Stat label="Total recepción TGS" value={totalRealizado > 0 ? `${totalRealizado.toFixed(1)} MMm³/d` : '—'} />
      </div>
      {motivo && (
        <div style={{
          marginTop: space.md,
          background: alertColor + '22',
          border: `1px solid ${alertColor}`,
          borderRadius: 6,
          padding: `${space.sm}px ${space.md}px`,
          color: alertColor,
          fontSize: 13,
          fontWeight: 600,
        }}>
          ⚠ {latest.alerta_estado ?? 'Alerta'} · {motivo}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ color: colors.textDim, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
