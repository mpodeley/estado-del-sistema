import { colors, sectionTitle, space } from '../theme'
import type { EnargasRDSRow } from '../types'

interface Props {
  reports: EnargasRDSRow[]
}

const consumoLabels: Record<string, string> = {
  prioritaria: 'Prioritaria',
  cammesa: 'CAMMESA',
  industria: 'Industria (P3+GU)',
  gnc: 'GNC',
  combustible: 'Combustible',
}

const importLabels: Record<string, string> = {
  bolivia: 'Bolivia',
  chile: 'Chile',
  escobar: 'GNL Escobar',
  bahia_blanca: 'GNL Bahía Blanca',
}

export default function EnargasRDSPanel({ reports }: Props) {
  if (!reports || reports.length === 0) {
    return (
      <p style={{ color: colors.textDim, fontSize: 13 }}>
        No hay reportes RDS disponibles todavía. Corré el pipeline para descargar los de ENARGAS.
      </p>
    )
  }

  const latest = reports[reports.length - 1]

  return (
    <div>
      <h3 style={sectionTitle}>
        ENARGAS RDS diario
        <span style={{ float: 'right', fontSize: 11, color: colors.textDim, textTransform: 'none' }}>
          {latest.source ?? ''}
        </span>
      </h3>
      <p style={{ color: colors.textDim, fontSize: 11, marginBottom: space.md }}>
        Datos automáticos scrapeados del Reporte Diario del Sistema publicado por ENARGAS
        {latest.fecha ? ` — día operativo ${latest.fecha}` : ''}.
      </p>

      <div style={grid2}>
        <Stat label="Line pack total" value={latest.linepack_total} unit="MMm³" highlight />
        <Stat label="Delta" value={latest.linepack_delta} unit="MMm³" signed />
        <Stat label="Consumo total" value={latest.consumo_total_estimado} unit="MMm³/d" highlight />
        <Stat
          label="Temp. BA (tm)"
          value={latest.temperatura_ba?.tm ?? null}
          unit="°C"
          suffix={
            latest.temperatura_ba?.min != null && latest.temperatura_ba?.max != null
              ? ` (${latest.temperatura_ba.min}-${latest.temperatura_ba.max})`
              : ''
          }
        />
      </div>

      <h4 style={subheader}>Consumo por segmento (programa, MMm³/d)</h4>
      <BreakdownTable
        items={Object.entries(latest.consumos ?? {}).map(([key, v]) => ({
          label: consumoLabels[key] ?? key,
          value: v.programa,
          compare: v.misma_semana_2025 ?? v.prom_mes_2025 ?? null,
        }))}
        compareLabel="Misma sem 25"
      />

      <h4 style={subheader}>Importación de gas (MMm³/d)</h4>
      <BreakdownTable
        items={Object.entries(latest.importaciones ?? {}).map(([key, v]) => ({
          label: importLabels[key] ?? key,
          value: v.programa ?? null,
          compare: v.misma_semana_prev_year ?? null,
        }))}
        compareLabel="Misma sem 25"
      />

      {latest.exportaciones && (
        <>
          <h4 style={subheader}>Exportaciones (MMm³/d)</h4>
          <BreakdownTable
            items={Object.entries(latest.exportaciones).map(([key, v]) => ({
              label: key.toUpperCase(),
              value: v.vol_exportar ?? null,
              compare: null,
            }))}
            compareLabel=""
          />
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  highlight,
  signed,
  suffix,
}: {
  label: string
  value: number | null | undefined
  unit: string
  highlight?: boolean
  signed?: boolean
  suffix?: string
}) {
  const color = highlight ? colors.textPrimary : colors.textSecondary
  let display: string = '-'
  if (value != null) {
    display = signed && value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
  }
  const signColor =
    signed && value != null
      ? value > 0
        ? colors.status.ok
        : value < 0
        ? colors.status.err
        : colors.textDim
      : color
  return (
    <div
      style={{
        padding: `${space.sm}px ${space.md}px`,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        background: colors.surfaceAlt,
      }}
    >
      <div style={{ color: colors.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ color: signColor, fontSize: 20, fontWeight: 700, marginTop: 2 }}>
        {display}
        <span style={{ color: colors.textDim, fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
          {unit}
          {suffix}
        </span>
      </div>
    </div>
  )
}

function BreakdownTable({
  items,
  compareLabel,
}: {
  items: { label: string; value: number | null; compare: number | null }[]
  compareLabel: string
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: space.sm }}>
      <thead>
        <tr>
          <th style={th}></th>
          <th style={{ ...th, textAlign: 'right' }}>Programa</th>
          {compareLabel && <th style={{ ...th, textAlign: 'right' }}>{compareLabel}</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <td style={td}>{item.label}</td>
            <td style={{ ...td, textAlign: 'right', color: colors.textPrimary, fontWeight: 600 }}>
              {item.value != null ? item.value.toFixed(1) : '-'}
            </td>
            {compareLabel && (
              <td style={{ ...td, textAlign: 'right', color: colors.textDim }}>
                {item.compare != null ? item.compare.toFixed(1) : '-'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: space.sm,
  marginBottom: space.md,
}

const subheader: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: `${space.md}px 0 ${space.xs}px`,
  fontWeight: 600,
}

const th: React.CSSProperties = {
  padding: '4px 6px',
  color: colors.textMuted,
  fontSize: 10,
  textTransform: 'uppercase',
  fontWeight: 600,
  textAlign: 'left',
  borderBottom: `1px solid ${colors.border}`,
}

const td: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: `1px solid ${colors.surface}`,
  color: colors.textSecondary,
}
