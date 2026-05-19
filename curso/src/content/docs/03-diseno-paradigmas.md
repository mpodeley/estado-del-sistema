---
title: "3. Cómo se diseña una aplicación (paradigmas)"
description: "Separar datos, lógica y presentación. El contrato JSON entre la pipeline y la web. Static vs dinámico."
sidebar:
  order: 3
---

> **Objetivo del módulo.** Que termines entendiendo por qué este proyecto está partido en pedazos como está, qué hace cada pedazo, y por qué esa separación es la que te permite cambiar una cosa sin romper otra.

---

## 1. El problema con Excel a escala

Empecemos por algo familiar. Imaginate tu reporte diario en Excel:

- Una hoja **"Datos"** donde pegás lo que bajaste de ENARGAS, CAMMESA y el clima.
- Una hoja **"Cálculos"** con `=PROMEDIO(...)`, `=SI(...)`, `BUSCARV` por todos lados.
- Una hoja **"Reporte"** con los gráficos y la tabla resumen que mostrás.

Ese Excel funciona perfecto hasta que:

1. Cambiás el formato de la fuente y se rompen tres fórmulas.
2. Querés agregar otra ciudad al promedio de temperatura y tenés que tocar 12 celdas.
3. Te vas de vacaciones y nadie más se atreve a abrir el archivo.

El tablero del que viste el código resuelve esos mismos problemas separando todavía más las partes — porque tiene que correr todos los días, en una máquina sin nadie adelante, sin romperse.

## 2. Tres capas, una idea

Casi todas las aplicaciones del mundo están organizadas, de alguna forma, en **tres capas**:

| Capa | Qué hace | Equivalente Excel |
|---|---|---|
| **Datos** | Guarda los hechos. Lo que es verdad. | La hoja "Datos" — números crudos |
| **Lógica** | Transforma esos hechos. Calcula, modela, valida. | La hoja "Cálculos" — fórmulas |
| **Presentación** | Muestra el resultado al usuario. | La hoja "Reporte" — gráficos |

**¿Por qué se separan?** Porque cuando una parte tiene que cambiar, querés que las otras dos no se enteren.

- Cambiar el color de un gráfico **no** debería tocar cómo se calcula el promedio.
- Cambiar el modelo de forecast **no** debería romper la importación del PDF.
- Cambiar el PDF de origen (ENARGAS hace un rediseño) **no** debería forzarte a rehacer todos los gráficos.

Cuando las capas están **acopladas** (mezcladas), cualquier cambio chico arrastra cambios en cascada. Es exactamente la sensación de "le toqué una fórmula y se rompió otra hoja". Cuando están **separadas con un contrato claro entre ellas**, podés trabajar en una sin pensar en las otras.

## 3. El "contrato" entre componentes

Para que dos partes separadas se puedan hablar, necesitan un **contrato**: un formato fijo, escrito, que ambas respetan.

En este repo, el contrato entre la pipeline Python (capa de datos + lógica) y la web React (capa de presentación) son los **archivos JSON** en [`public/data/`](https://github.com/mpodeley/estado-del-sistema/tree/master/public/data). Todos tienen la misma forma:

```json
{
  "generated_at": "2026-05-19T09:00:31Z",
  "source": "scripts/fetch_weather.py",
  "source_date": "2026-05-19",
  "data": [ ... lo que sea ... ]
}
```

Esa envoltura (`generated_at`, `source`, `source_date`, `data`) está estandarizada en una sola función: [`scripts/_meta.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/_meta.py). Todos los scripts Python escriben sus JSON usando esa misma función — y la web React, en [`src/hooks/useData.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/hooks/useData.ts), los lee asumiendo esa misma envoltura.

**¿Qué ganamos con un contrato?**

- La pipeline puede cambiar **cómo** trae los datos sin que la web se entere, mientras siga escribiendo el mismo JSON.
- La web puede rediseñarse de cero sin tocar Python, mientras siga leyendo el mismo JSON.
- Si alguien (el agente, vos, o otro analista) toca uno de los dos lados, **solo necesita conocer ese lado**.

> 💡 **Analogía Excel:** es como si te pusieras de acuerdo con tu compañero de equipo: "yo te paso siempre un archivo con estas mismas columnas, en este mismo orden, todos los días a las 9. Vos hacés tu reporte con eso. Si yo cambio cómo lo armo, no te importa — sigue siendo el mismo archivo".

## 4. Static vs dinámico

Hay dos grandes formas de servir una aplicación web:

### Dinámica (la mayoría de los sitios)
Cada vez que abrís la página, un **servidor** corre código en ese momento, consulta una base de datos, arma la página y te la manda. Si entran 1000 usuarios al mismo tiempo, el servidor trabaja 1000 veces. Necesitás infraestructura corriendo 24/7 y alguien que la cuide.

### Estática (este tablero)
La página entera (HTML, CSS, JS, JSONs) se **arma una sola vez por adelantado** y se sube a un servicio de hosting que solo sirve archivos. Cuando entrás, te bajás archivos ya hechos. No hay código corriendo del lado del servidor.

**Este proyecto es estático.** El "armado" lo hace [una GitHub Action](https://github.com/mpodeley/estado-del-sistema/blob/master/.github/workflows/update-data.yml) que se dispara una vez por día a las 6 AM Argentina:

1. Corre la pipeline Python → escribe los JSON en `public/data/`.
2. Corre el build de la web React → escribe el HTML+JS final en `dist/`.
3. Sube todo eso a [GitHub Pages](https://pages.github.com/), el hosting gratuito de GitHub.

**¿Qué implica?**
- ✅ Mantener el sitio es prácticamente gratis (cero servidores).
- ✅ Si la pipeline falla, el sitio sigue funcionando con los datos del día anterior.
- ❌ No podés tener funcionalidades que requieran "el servidor sabe quién sos" — el sitio es el mismo para todos.
- ❌ La data está fresca cada 24 hs, no segundo a segundo.

Para el caso de uso (un reporte operativo diario), esa elección es la correcta. Te ahorra una capa entera de complejidad.

## 5. Cómo se ve aplicado a este repo (data flow)

```
   Fuentes públicas                Pipeline Python              Contrato              Frontend                Lo que ves
  ─────────────────                ─────────────────            ─────────             ─────────              ──────────
  • ENARGAS (PDFs RDS)
  • CAMMESA (PDFs + XLS) ────→  scripts/fetch_*.py    ────→   public/data/  ────→   src/hooks/      ────→   Browser
  • Open-Meteo (API)             scripts/parse_*.py            *.json               useData.ts              Gráficos
  • MEGSA (API)                  scripts/generate_forecast.py  *.csv                src/components/         Paneles
  • SMN (zip)                                                                       *.tsx                   KPIs
                                  build_data.py (orquesta)
```

Cada flecha es un punto de contacto entre dos capas. Si te ponés a leer el código y te perdés, anclate en este diagrama:

- ¿Estás tocando un PDF nuevo o una API? → estás en [`scripts/fetch_*.py`](https://github.com/mpodeley/estado-del-sistema/tree/master/scripts).
- ¿Estás transformando un PDF en datos limpios? → [`scripts/parse_*.py`](https://github.com/mpodeley/estado-del-sistema/tree/master/scripts).
- ¿Estás entrenando un modelo? → [`scripts/generate_forecast.py`](https://github.com/mpodeley/estado-del-sistema/blob/master/scripts/generate_forecast.py).
- ¿Estás cambiando cómo se ve algo? → [`src/components/`](https://github.com/mpodeley/estado-del-sistema/tree/master/src/components).
- ¿Estás cambiando qué se lee y de dónde? → [`src/hooks/useData.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/hooks/useData.ts).

## 6. Por qué importa para vos

Cuando trabajes con un coding agent (Módulo 6 y 7), vas a tener que decirle **qué capa tocar**. Saber identificar eso es la diferencia entre:

- ❌ "Quiero que el gráfico de temperatura muestre también humedad."
- ✅ "Quiero agregar humedad al tablero. Vamos por partes: primero ampliemos el fetcher en `scripts/fetch_weather.py` para traer humedad de Open-Meteo, después actualicemos el JSON, y al final agregamos una línea más al gráfico en `src/components/TemperatureChart.tsx`. Empecemos por el fetcher."

La segunda versión es mucho más fácil de ejecutar para el agente (y de revisar para vos) porque respeta las capas.

## 7. Checklist antes de seguir

- [ ] Entendés por qué `public/data/*.json` es el "contrato" entre Python y React.
- [ ] Podés decir en una oración qué hace `scripts/build_data.py` vs. qué hace `src/App.tsx`.
- [ ] Tenés intuición de por qué este sitio es estático y no dinámico.

Cuando los tres están, seguí al **[Módulo 4 — Las partes de este proyecto](/estado-del-sistema/curso/04-partes-del-proyecto/)** para hacer un tour más detallado, o saltá al **[Módulo 7 — Skills y mejores prácticas](/estado-del-sistema/curso/07-skills-mejores-practicas/)** si querés ya meterte con el agente.
