import type { DailyRow } from '../types'

interface Props {
  title: string
  color: string
  data: DailyRow[]
  linepackKey: 'linepack_tgs' | 'linepack_tgn'
  varKey: 'var_linepack_tgs' | 'var_linepack_tgn'
  limInfKey: 'lim_inf_tgs' | 'lim_inf_tgn'
  limSupKey: 'lim_sup_tgs' | 'lim_sup_tgn'
  /** Si está, el ESTADO sale de este campo (estado real ABII) en vez de la
   *  banda lim_inf/lim_sup. TGN lo usa; TGS sigue con la banda. */
  estadoKey?: 'estado_tgn'
}

const s = {
  panel: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' } as React.CSSProperties,
  th: { padding: '6px 8px', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase' as const, fontWeight: 600, textAlign: 'left' as const, borderBottom: '1px solid #334155' },
  td: { padding: '8px 8px', fontSize: 14, borderBottom: '1px solid #1e293b' } as React.CSSProperties,
  status: (val: number | null, inf: number | null, sup: number | null) => {
    if (val == null || inf == null || sup == null) return { color: '#64748b', label: '-' }
    if (val < inf) return { color: '#ef4444', label: 'BAJO' }
    if (val > sup) return { color: '#f59e0b', label: 'ALTO' }
    return { color: '#10b981', label: 'NORMAL' }
  },
  // Estado autoritativo reportado por ABII (string). ALERTA = ámbar.
  estadoBadge: (estado: string) => {
    const up = estado.toUpperCase()
    if (up.includes('ALERTA')) return { color: '#f59e0b', label: 'ALERTA' }
    if (up.includes('EMERG') || up.includes('CRÍT') || up.includes('CRIT')) return { color: '#ef4444', label: up }
    return { color: '#10b981', label: 'NORMAL' }
  },
}

function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${days[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}`
}

export default function SystemPanel({ title, color, data, linepackKey, varKey, limInfKey, limSupKey, estadoKey }: Props) {
  // Últimos 6 días con linepack (n-1 a n-6) — el analista pidió ampliar de 3 a 6.
  const last6 = data.filter(d => d[linepackKey] != null).slice(-6)
  const limInf = last6[0]?.[limInfKey] as number | null
  const limSup = last6[0]?.[limSupKey] as number | null

  return (
    <div style={{ ...s.panel, borderTop: `3px solid ${color}` }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={s.th}>Día</th>
            <th style={{ ...s.th, textAlign: 'right' }}>Linepack</th>
            <th style={{ ...s.th, textAlign: 'right' }}>Var</th>
            <th style={{ ...s.th, textAlign: 'center' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {last6.map((row, i) => {
            const val = row[linepackKey] as number | null
            const varVal = row[varKey] as number | null
            const estadoVal = estadoKey ? (row[estadoKey] as string | null) : null
            const st = estadoVal ? s.estadoBadge(estadoVal) : s.status(val, limInf, limSup)
            return (
              <tr key={i} style={{ background: i === last6.length - 1 ? '#0f172a' : 'transparent' }}>
                <td style={{ ...s.td, color: '#e2e8f0', fontWeight: i === last6.length - 1 ? 700 : 400 }}>
                  {fmtDate(row.fecha)}
                </td>
                <td style={{ ...s.td, textAlign: 'right', color: '#f1f5f9', fontWeight: 600, fontSize: 16 }}>
                  {val?.toFixed(1) ?? '-'}
                </td>
                <td style={{ ...s.td, textAlign: 'right', color: varVal != null ? (varVal >= 0 ? '#10b981' : '#ef4444') : '#64748b' }}>
                  {varVal != null ? `${varVal >= 0 ? '+' : ''}${varVal.toFixed(1)}` : '-'}
                </td>
                <td style={{ ...s.td, textAlign: 'center' }}>
                  <span style={{ background: st.color + '22', color: st.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
        <span>Lím. Inf: <b style={{ color: '#ef4444' }}>{limInf ?? '-'}</b></span>
        <span>Lím. Sup: <b style={{ color: '#10b981' }}>{limSup ?? '-'}</b></span>
      </div>
    </div>
  )
}
