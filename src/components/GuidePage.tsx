import { card, colors, sectionTitle, space } from '../theme'
import ForecastPage from './ForecastPage'

const linkStyle: React.CSSProperties = { color: colors.accent.blue, textDecoration: 'none' }

export default function GuidePage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: `${space.xl}px ${space.lg}px` }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, marginBottom: 4 }}>
        Guía de uso
      </h2>
      <p style={{ color: colors.textDim, fontSize: 14, marginBottom: space.xl }}>
        Cómo leer el tablero, de dónde salen los datos, y qué hacer si algo no cuadra.
      </p>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>Qué muestra el tablero</h3>
        <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          El outlook consolida la foto diaria del sistema de transporte de gas en Argentina:
          demanda por sector, inyecciones por cuenca, linepack en TGS / TGN, temperatura en Buenos
          Aires y el mix de combustibles que usa CAMMESA para generar electricidad. Está pensado para
          que el equipo de despacho / comercial vea en menos de un minuto <strong>dónde está parado el
          sistema hoy</strong> y <strong>qué se viene los próximos 14 días</strong>.
        </p>
      </div>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>Paneles principales</h3>
        <dl style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>KPI cards (arriba)</dt>
          <dd style={{ margin: 0 }}>
            Demanda total del día, temperatura promedio BA, y linepack TGS / TGN expresado como % del
            límite superior. Si el número aparece en "-" es porque el dato aún no fue publicado.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Paneles TGS / TGN</dt>
          <dd style={{ margin: 0 }}>
            Ventana de 3 días con linepack, variación y badge de estado:
            <strong style={{ color: colors.status.ok }}> NORMAL</strong> (dentro de banda),
            <strong style={{ color: colors.status.err }}> BAJO</strong> (por debajo del límite inferior),
            <strong style={{ color: colors.status.warn }}> ALTO</strong> (por encima del superior).
            Los límites se toman del Excel base y se pueden actualizar por sistema.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Comparación semanal</dt>
          <dd style={{ margin: 0 }}>
            Promedios de los últimos 7 días vs. los 7 previos. El delta en verde/rojo muestra la
            dirección del movimiento. Solo aparece si hay ≥14 días con datos válidos.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Forecast de demanda</dt>
          <dd style={{ margin: 0 }}>
            Línea sólida = real (del Excel base). Línea punteada = estimada con regresión
            temperatura → demanda. La marca "Hoy" separa lo que pasó de lo que se proyecta.
            <br />
            <em style={{ color: colors.textDim }}>
              Importante: hoy el R² de la demanda total es bajo (~0.08). Tomá ese forecast como
              indicativo, no como número firme.
            </em>
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Charts de soporte</dt>
          <dd style={{ margin: 0 }}>
            Demanda por sector (stacked area), linepack con bandas min/max, temperatura real +
            forecast 14 días, y mix de combustibles eléctrico de CAMMESA.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Inyecciones (chart + tabla)</dt>
          <dd style={{ margin: 0 }}>
            Área apilada por fuente (TGS, TGN, ENARSA, GPM, Bolivia, Escobar) para ver cómo evoluciona
            la oferta en el tiempo, más una tabla abajo con los valores exactos de los últimos días.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Próximos barcos GNL</dt>
          <dd style={{ margin: 0 }}>
            Calendario de cargamentos LNG programados por puerto (GNL Escobar, GNL Bahía Blanca),
            expresado en MMm³/día de regasificación. Fuente: campo "Vol. a Inyectar Próximos Barcos"
            del RDS. Los volúmenes concentran en meses de invierno (mayo–agosto).
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Ranking "Ciudades más frías"</dt>
          <dd style={{ margin: 0 }}>
            Top‑5 de ciudades con el mínimo más bajo en los próximos 7 días (forecast Open-Meteo para
            10 ciudades clave: BA, Rosario, Córdoba, Santa Fe, Mendoza, Neuquén, Bahía Blanca, Esquel,
            Salta, Tucumán). Sirve como alerta temprana de picos de demanda prioritaria.
          </dd>

          <dt style={{ fontWeight: 600, color: colors.textPrimary, marginTop: space.md }}>Histórico año-sobre-año</dt>
          <dd style={{ margin: 0 }}>
            Con 2 años de RDS diarios backfilleados, mostramos cada año en una línea separada sobre
            el mismo eje calendario (enero→diciembre). Línea gruesa = año actual; tenues = años
            previos. Para ver si estamos por encima/debajo del patrón estacional típico.
          </dd>
        </dl>
      </div>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>De dónde salen los datos</h3>
        <ul style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.7, paddingLeft: space.xl }}>
          <li>
            <strong>ENARGAS RDS diario</strong> (automático): Reporte Diario del Sistema publicado por{' '}
            <a href="https://www.enargas.gob.ar/secciones/transporte-y-distribucion/dod-reporte-diario-sistema.php"
               target="_blank" rel="noopener" style={linkStyle}>ENARGAS</a>.
            El pipeline descarga <code>RDS_YYYYMMDD.pdf</code> y extrae line pack total, importaciones
            (Bolivia, Chile, Escobar, Bahía Blanca), exportaciones TGN/TGS, consumo por segmento
            (prioritaria, CAMMESA, industria, GNC, combustible), temperatura BA + forecast 6 días.
            <br />
            <em style={{ color: colors.textDim }}>
              Ésta es la fuente principal de datos macro automáticos — reemplaza buena parte del Excel manual.
            </em>
          </li>
          <li>
            <strong>CAMMESA programación semanal</strong> (automático): PDF <code>PS_YYYYMMDD.pdf</code>{' '}
            con forecast de dispatch. Scrapeado de{' '}
            <a href="https://cammesaweb.cammesa.com/programacion-semanal/"
               target="_blank" rel="noopener" style={linkStyle}>cammesaweb.cammesa.com</a>.
          </li>
          <li>
            <strong>Open-Meteo</strong> (automático): forecast de temperatura 14 días para 10 ciudades
            (BA, Rosario, Córdoba, Santa Fe, Mendoza, Neuquén, Bahía Blanca, Esquel, Salta, Tucumán).
            API pública y gratuita.
          </li>
          <li>
            <strong>Excel base</strong> (<code>raw/Base Reporte Estado de Sistema.xlsx</code>): fuente
            histórica manual. Se está migrando a fuentes automáticas (RDS diario es el primer paso).
          </li>
        </ul>
        <p style={{ color: colors.textDim, fontSize: 13, marginTop: space.md }}>
          Ver la pestaña <strong>Fuentes</strong> para el detalle completo y los links.
        </p>
      </div>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>Frescura de los datos</h3>
        <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          En la cabecera vas a ver badges de color al lado de la fecha:
        </p>
        <ul style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.7, paddingLeft: space.xl }}>
          <li><span style={{ color: colors.status.ok }}>Verde (ok)</span>: el dato se actualizó hace menos de 30 h.</li>
          <li><span style={{ color: colors.status.warn }}>Naranja</span>: 30–48 h de antigüedad. Posible atraso.</li>
          <li><span style={{ color: colors.status.err }}>Rojo (stale)</span>: más de 48 h. Los números pueden estar desactualizados — conviene revisar el pipeline.</li>
        </ul>
      </div>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>Subir archivos manualmente</h3>
        <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          Si tenés un PDF/Excel que el scraper no trae solo (por ejemplo, un reporte de TGS/TGN que
          bajaste del portal), se puede dropear en la carpeta <code>raw/incoming/</code> del repo.
          El pipeline lo detecta en la próxima corrida, lo mueve al lugar correcto y deja una copia
          timestampeada en <code>raw/incoming/_archive/</code>.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.6, marginTop: space.sm }}>
          Nombres reconocidos:
        </p>
        <ul style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.7, paddingLeft: space.xl }}>
          <li><code>ETGS*.pdf</code> → parser ENARGAS</li>
          <li><code>PS_YYYYMMDD.pdf</code> → parser CAMMESA semanal</li>
          <li><code>*linepack*.xlsx</code> → parser linepack</li>
          <li><code>Base Reporte*.xlsx</code> → reemplaza el Excel maestro</li>
        </ul>
      </div>

      <div style={{ ...card, marginBottom: space.lg }}>
        <h3 style={sectionTitle}>Si algo no cuadra</h3>
        <ul style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.7, paddingLeft: space.xl }}>
          <li><strong>Un KPI dice "-"</strong>: el dato aún no fue publicado para esa fecha. Esperá al próximo build (corre todos los días a las 6 AM ARG).</li>
          <li><strong>Badge en rojo</strong>: el pipeline falló o la fuente no publicó. Revisá el log del último GitHub Action corrido.</li>
          <li><strong>Forecast raro</strong>: mirá la nota debajo del chart — el R² te dice cuán confiable es. Si es &lt; 0.3 tomalo como orientación, no como pronóstico fino.</li>
          <li><strong>Linepack con bandas raras</strong>: los límites salen del Excel. Si cambiaron en la realidad, actualizalo en las columnas correspondientes.</li>
        </ul>
      </div>

      <div style={{ ...card }}>
        <h3 style={sectionTitle}>Limitaciones actuales</h3>
        <ul style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 1.7, paddingLeft: space.xl }}>
          <li>Temperatura multi-ciudad ya disponible, pero el chart diario sigue siendo Buenos Aires (drop-down para cambiar).</li>
          <li>Regresión lineal simple; no incluye día de semana, feriados ni estacionalidad. Necesita más histórico de demanda para mejorar.</li>
          <li>El RDS reporta <em>programa</em> (planificado), no <em>real</em>. Para el dato cerrado de CAMMESA seguimos bloqueados por credenciales.</li>
          <li>Restricciones de transporte (Gas Andes, CCO, TGS NQN) están en el Excel pero aún no visualizadas.</li>
          <li>Stock GNL (Escobar, Bahía Blanca) se publica en el RDS pero todavía no lo graficamos aparte.</li>
        </ul>
      </div>

      <hr style={{ marginTop: space.xl * 2, marginBottom: space.xl, border: 0, borderTop: `1px solid ${colors.border}` }} />
      <ForecastPage />
    </div>
  )
}
