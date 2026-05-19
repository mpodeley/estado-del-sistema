---
title: "1. De Excel a una aplicación"
description: "Qué cambia y qué no cuando pasás de un Excel a una aplicación web. Vista panorámica del tablero."
sidebar:
  order: 1
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Identificar **qué problemas de Excel** resuelve una aplicación web, y cuáles no.
- Tener una vista panorámica del tablero [Estado del Sistema](https://mpodeley.github.io/estado-del-sistema/) antes de meterse con el código.
- Entender por qué este proyecto existe como app y no como un Excel compartido.

## Sumario

1. **Qué hace Excel bien** — fórmulas ad hoc, exploración rápida, gráficos al toque, todos saben usarlo.
2. **Qué hace Excel mal a escala** — versionado (¿cuál es el archivo bueno?), reproducibilidad (¿lo corro y sale lo mismo?), automatización (alguien lo tiene que abrir todos los días).
3. **Qué problemas resuelve una app web** — datos siempre frescos, una sola fuente de verdad, accesible desde cualquier browser, se actualiza sola.
4. **Lo que sigue valiendo de Excel** — para exploración personal y prototipado sigue siendo lo mejor. La app no compite con eso.
5. **Tour del tablero** — Operación / Mapa / Histórico / Guía / Fuentes / Estado. Qué hay en cada una.

## Lecturas mientras tanto

- [`README.md`](https://github.com/mpodeley/estado-del-sistema) del repo.
- [`src/components/GuidePage.tsx`](https://github.com/mpodeley/estado-del-sistema/blob/master/src/components/GuidePage.tsx) — la Guía del tablero ya es una buena intro al producto.

Cuando lo tengamos completo, este módulo va a ser la antesala natural del [Módulo 3 — Diseño y paradigmas](/estado-del-sistema/curso/03-diseno-paradigmas/), que ya está escrito.
