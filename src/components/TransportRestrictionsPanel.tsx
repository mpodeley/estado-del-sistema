import { colors, sectionTitle, space } from '../theme'
import type { TramoRow } from '../hooks/useData'

interface Props {
  rows: TramoRow[]
}

interface TramoDef {
  id: string
  label: string
  capacidad: number | null
  corte: number | null
  note?: string
}

function utilization(cap: number | null, corte: number | null): { pct: number; color: string; label: string } | null {
  if (cap == null || cap === 0) return null
  const cut = corte ?? 0
  const used = cap + cut // corte is negative when capacity is reduced
  const pct = Math.max(0, Math.min(100, (used / cap) * 100))
  if (cut >= -0.1) return { pct, color: colors.status.ok, label: 'OK' }
  if (cut >= -3) return { pct, color: colors.accent.orange, label: 'Corte leve' }
  return { pct, color: colors.status.err, label: 'Corte fuerte' }
}

function fmtDate(iso: string): string {
  const dt = new Date(iso + 'T12:00:00')
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
}

export default function TransportRestrictionsPanel({ rows }: Props) {
  if (!rows || rows.length === 0) return null
  const latest = rows[rows.length - 1]
  const tramos: TramoDef[] = [
    { id: 'cco', label: 'CCO', capacidad: latest.cco_capacidad, corte: latest.cco_corte, note: 'Centro Oeste' },
    { id: 'tgs_nqn', label: 'TGS NQN', capacidad: latest.tgs_nqn_capacidad, corte: latest.tgs_nqn_corte, note: 'NQN hacia TGS' },
    { id: 'gas_andes', label: 'Gas Andes', capacidad: latest.gas_andes_autorizacion, corte: 0, note: 'autorización export' },
  ]

  // Stale date indicator: tramos data often lags 2-3 weeks vs the outlook's
  // "today" because it's still manually copied into the Excel.
  const ageDays = Math.round((Date.now() - new Date(latest.fecha + 'T12:00:00').getTime()) / 86_400_000)

  return (
    <div>
      <h3 style={sectionTitle}>
        Restricciones de transporte
        <span style={{ float: 'right', fontSize: 11, color: colors.textDim, textTransform: 'none', fontWeight: 400 }}>
          Última carga: {fmtDate(latest.fecha)}{ageDays > 3 ? ` · ${ageDays}d atrás` : ''}
        </span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: space.md }}>
        {tramos.map((t) => {
          const util = utilization(t.capacidad, t.corte)
          return (
            <div key={t.id} style={{
              background: colors.surfaceAlt,
              border: `1px solid ${colors.border}`,
              borderLeft: `3px solid ${util?.color ?? colors.textDim}`,
              borderRadius: 8,
              padding: `${space.sm + 2}px ${space.md}px`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 700 }}>{t.label}</span>
                {util && (
                  <span style={{ color: util.color, fontSize: 11, fontWeight: 600 }}>
                    {util.label}
                  </span>
                )}
              </div>
              {t.note && <div style={{ color: colors.textDim, fontSize: 11, marginBottom: space.xs }}>{t.note}</div>}
              {util && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: space.xs }}>
                    <span style={{ color: colors.textMuted }}>Capacidad</span>
                    <span style={{ color: colors.textSecondary, fontWeight: 600 }}>{t.capacidad?.toFixed(1)} MMm³/d</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                    <span style={{ color: colors.textMuted }}>Corte</span>
                    <span style={{ color: (t.corte ?? 0) < 0 ? colors.status.err : colors.textSecondary, fontWeight: 600 }}>
                      {t.corte != null && t.corte !== 0 ? `${t.corte >= 0 ? '+' : ''}${t.corte.toFixed(1)}` : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 2 }}>
                    <span style={{ color: colors.textMuted }}>Utilización</span>
                    <span style={{ color: util.color, fontWeight: 700 }}>{util.pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, background: colors.surface, borderRadius: 2, marginTop: space.xs, overflow: 'hidden' }}>
                    <div style={{ width: `${util.pct}%`, height: '100%', background: util.color }} />
                  </div>
                </>
              )}
              {!util && (
                <div style={{ color: colors.textDim, fontSize: 12, marginTop: space.xs }}>Sin capacidad reportada</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
