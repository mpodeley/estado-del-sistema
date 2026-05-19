---
title: "7. Skills y mejores prácticas con coding agents"
description: "Slash commands, sub-agents, hooks, modo plan, memoria persistente. Qué hacer y qué no hacer cuando trabajás con Claude Code o Codex."
sidebar:
  order: 7
---

> **Objetivo del módulo.** Que después de leer esto sepas qué *puede* hacer un coding agent, cómo pedírselo bien, y los anti-patrones que te garantizan frustración.

---

## 1. Qué es un coding agent

Un **coding agent** es un asistente de programación que:

- Vive en tu terminal o en tu editor.
- Puede **leer** los archivos de tu repo.
- Puede **modificar** archivos (con tu aprobación).
- Puede **correr comandos** (con tu aprobación).
- Puede **buscar** en la web.
- Puede **abrir Pull Requests** en GitHub.

Los dos que más vas a oír nombrar son **Claude Code** (Anthropic) y **Codex** (OpenAI). En este curso usamos los ejemplos pensando en Claude Code, pero las ideas se aplican a ambos.

Lo importante: **no es magia, es una herramienta**. Si le pedís cosas vagas, te da cosas vagas. Si le das contexto, te da un cambio sólido.

## 2. Capacidades del agente (vista rápida)

### Slash commands

Comandos rápidos que arrancan con `/`. Los más útiles:

- **`/help`** — ¿olvidaste qué podés hacer? Esto te lo recuerda.
- **`/clear`** — limpia la conversación actual. Útil cuando arrancás un task nuevo y no querés que arrastre contexto viejo.
- **`/plan`** — entra en *modo plan*: el agente investiga, te propone un plan por escrito, y **no toca código** hasta que aprobás. Ideal para cambios estructurales o cosas que tocan varias capas.

> 💡 Este mismo curso fue planeado con `/plan` antes de escribir una sola línea de código.

### Sub-agents (Agent / Explore / Plan)

El agente puede *delegar* una tarea acotada a otro agente especializado. Vos no tenés que invocarlos a mano — el agente principal los usa cuando le conviene. Pero está bueno saber que existen:

- **Explore** — sale a leer muchos archivos rápido (ej.: "buscá en todo el repo dónde se usa esta función"). El resultado no contamina tu conversación principal.
- **Plan** — para diseñar implementaciones complejas.
- **general-purpose** — para tareas que no calzan en una categoría.

Cuando le pidas algo grande, podés sugerir: *"explorá el repo primero antes de decidir cómo hacerlo"*.

### Hooks (avanzado)

**Hooks** son scripts que se disparan en eventos del agente (antes de editar, después de un commit, etc.). Sirven para automatizar verificaciones — por ejemplo, correr `tsc --noEmit` después de cada cambio en `.tsx`. No te preocupes por esto al principio; está documentado en `~/.claude/settings.json`.

### Modo plan vs modo ejecución

| Modo | Cuándo usarlo |
|---|---|
| **Ejecución directo** | Cambios chicos y reversibles: agregar un comentario, renombrar una variable, ajustar un color. |
| **Modo plan (`/plan`)** | Cambios estructurales, cosas que tocan varias capas, refactors, agregar una fuente de datos nueva. |

Cuando dudes, andá a plan. Te cuesta 30 segundos extra y te ahorra deshacer un cambio mal pensado.

## 3. Memoria persistente

El agente tiene **tres lugares** donde guarda contexto que sobrevive entre conversaciones. Saber qué hay en cada uno te ahorra repetirle cosas.

### `CLAUDE.md` (en la raíz del repo)

Es el **manual del repo para el agente**. Cualquier conversación que arranque en este directorio lo lee primero. Contiene: qué hace el proyecto, comandos clave, arquitectura, gotchas.

🔗 [`CLAUDE.md` del proyecto](https://github.com/mpodeley/estado-del-sistema/blob/master/CLAUDE.md) — leelo *vos* también, una vez. Te sitúa más rápido que cualquier explicación que te pueda dar yo acá.

### `.claude/memory/` (notas que sobreviven)

Carpeta donde el agente guarda **observaciones** que te conviene que recuerde entre sesiones. Hay cuatro tipos:

- **user** — cosas sobre vos (tu rol, qué sabés, qué preferís).
- **feedback** — correcciones tuyas que el agente debe aplicar siempre.
- **project** — contexto del proyecto que no está en el código.
- **reference** — punteros a sistemas externos (Linear, dashboards, etc.).

🔗 Mirá el [`MEMORY.md`](https://github.com/mpodeley/estado-del-sistema/blob/master/.claude/memory/MEMORY.md) del repo para ver ejemplos reales. Algunos relevantes:

- [`feedback_simplicity.md`](https://github.com/mpodeley/estado-del-sistema/blob/master/.claude/memory/feedback_simplicity.md) — "mantener la app simple, sin abstracciones especulativas".
- [`feedback_macro_data.md`](https://github.com/mpodeley/estado-del-sistema/blob/master/.claude/memory/feedback_macro_data.md) — "priorizar datos macro y automatización total".
- [`project_context.md`](https://github.com/mpodeley/estado-del-sistema/blob/master/.claude/memory/project_context.md) — "audiencia no técnica, mantenedor único".

### `.claude/plans/` (planes en curso)

Cuando usás `/plan`, el agente escribe el plan como un archivo en esta carpeta. Sobrevive entre sesiones, así que podés *pausar* un plan grande y retomarlo otro día.

## 4. Buenas prácticas

Las que más diferencia hacen, ordenadas por impacto:

### 4.1. Dale contexto explícito

| ❌ Vago | ✅ Específico |
|---|---|
| "Agregale humedad al gráfico." | "Quiero agregar humedad al gráfico de temperatura en `src/components/TemperatureChart.tsx`. El dato vendría de Open-Meteo (ya lo estamos consultando en `scripts/fetch_weather.py`) — habría que ampliarlo para incluir `relative_humidity_2m`. ¿Empezamos por el fetcher?" |

Notá: archivo concreto, función concreta, capa concreta, y un siguiente paso propuesto.

### 4.2. Empezá chico

Una sola cosa por conversación. Si mezclás "agregar humedad, cambiar colores y arreglar un bug del weekend", el diff resultante es imposible de revisar y si algo se rompe no sabés qué.

### 4.3. Leé el diff antes de aceptar

El agente puede equivocarse en silencio: renombrar mal una variable, borrar una línea que importaba, "limpiar" un comentario que era crucial. **Antes de aprobar una edición, leela**. Si no la entendés, pedile que te la explique línea por línea.

### 4.4. Pedí explicaciones, no solo código

> *"Antes de escribir, contame por qué elegirías esa función y no otra."*

Esto:
- Te enseña.
- Obliga al agente a pensar primero.
- Te deja detectar planes malos sin que toque un archivo.

### 4.5. Si algo se rompe, pegale el error literal

Nunca le digas *"no anda"*. Copiá y pegá el mensaje de error completo, con stack trace. El agente lee texto, no telepatía.

### 4.6. Cuando dudes, preguntá riesgos

Antes de aprobar un cambio grande:

> *"¿Qué riesgos tiene este cambio? ¿Qué le tendría que pedir a un compañero que revise específicamente?"*

El agente normalmente tiene buena idea de qué puede salir mal — pero solo si le pedís que mire.

### 4.7. Aprovechá el modo plan para cambios estructurales

Cualquier cosa que toque más de un archivo en capas distintas → `/plan`. Te ahorra horas.

### 4.8. Confirmá acciones irreversibles

Si te propone `git push --force`, `git reset --hard`, borrar archivos sin commitear, o cualquier cosa que no podés deshacer fácil → pará. Pedile alternativas. Solo aprobá si entendés exactamente qué hace.

## 5. Anti-patrones

Los errores típicos del usuario novato:

- **Cambios vagos sin abrir el archivo primero.** Si vos no podés señalar el archivo, el agente tampoco.
- **Aceptar el primer output sin leerlo.** Eventualmente vas a pisar trabajo bueno.
- **Ignorar warnings de TypeScript o de la pipeline.** Los warnings son el código gritándote que algo está mal. No los apagues, entendelos.
- **Encadenar 5 features en una conversación.** Imposible de revisar, imposible de revertir si una rompe.
- **Pedirle "magia" en código que vos no entendés.** El agente puede generar código sofisticado que vos no podés mantener. Si no entendés lo que produjo, **no lo merguees**. Pedile que te lo simplifique o que te lo explique antes.
- **Pelearte con el agente.** Si te dice tres veces que algo no se puede como lo estás pidiendo, escuchalo y ajustá el pedido en vez de insistir.

## 6. Cómo este repo te facilita el laburo

Aprovechá lo que ya está escrito:

1. **Antes de cualquier sesión** — leé `CLAUDE.md` (15 min). El agente lo va a leer; vos también deberías.
2. **Si vas a tocar arquitectura** — revisá el plan estratégico en `C:\Users\mpodeley\.claude\plans\toasty-gathering-sparkle.md` (ese es local, no está en GitHub).
3. **Si vas a agregar una fuente de datos** — leé `feedback_macro_data.md` en `.claude/memory/`. Te ahorra una vuelta.
4. **Si te tienta hacer una abstracción "para el futuro"** — leé `feedback_simplicity.md`. La regla del repo es: extraé cuando haya ≥3 repeticiones, no antes.
5. **Si querés contexto histórico** — `git log --oneline | head -50` o pedile al agente *"resumime los últimos 20 commits"*.

## 7. Tu primera sesión con Claude Code (preview del Módulo 9)

Por adelantar el Módulo 9 — así se ve una primera sesión típica:

1. Instalás Claude Code (instrucciones en el [Módulo 6](/estado-del-sistema/curso/06-coding-agents/)).
2. Abrís una terminal *en la carpeta del repo*: `cd C:\Users\mpodeley\Documents\projects\estado_del_sistema`.
3. Tipeás `claude` y enter.
4. Tu primer mensaje:

   ```
   Hola. Soy analista comercial, primera vez que toco este repo.
   Antes de hacer nada, por favor:
   1. Leé el CLAUDE.md y los archivos en .claude/memory/.
   2. Resumime en 5 bullets qué hace este proyecto y cuáles son las restricciones que tengo que respetar.
   3. Después contame cuál sería un buen primer cambio chico para arrancar.
   ```

5. Leés lo que te contesta. Hacés preguntas. **No le pedís que toque nada todavía.**
6. Cuando te sentís cómodo, le pedís un cambio chico (ej.: cambiar una palabra en la Guía del tablero).
7. Le pedís que arme el PR (el Módulo 8 explica esto).

## 8. Checklist antes de seguir

- [ ] Sabés diferenciar modo plan de modo ejecución.
- [ ] Sabés dónde mira el agente para tener contexto (`CLAUDE.md`, `.claude/memory/`, `.claude/plans/`).
- [ ] Identificás al menos 3 buenas prácticas que vas a aplicar desde la primera sesión.
- [ ] Tenés clara una regla: **leer el diff antes de aceptar, siempre**.

Cuando estés listo, seguí con **[Módulo 8 — Git, GitHub y deploy](/estado-del-sistema/curso/08-git-github-deploy/)** o saltá directo al **[Módulo 9 — Tu primer aporte](/estado-del-sistema/curso/09-primer-aporte/)** cuando esté disponible.
