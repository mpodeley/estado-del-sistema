---
title: "6. Coding agents: tu nuevo asistente"
description: "Qué son Claude Code y Codex, cómo instalarlos, anatomía de una conversación útil."
sidebar:
  order: 6
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Entender qué *es* y qué *no es* un coding agent.
- Tener Claude Code instalado y funcionando en tu máquina.
- Tener una primera conversación productiva.

## Sumario

1. **Qué hace un coding agent** — lee, escribe, corre comandos (todo con tu aprobación).
2. **Claude Code vs Codex vs Cursor** — diferencias prácticas. Para este curso, usamos Claude Code como ejemplo.
3. **Instalación**:
   - Requisitos: tener una terminal (PowerShell en Windows ya viene), Node.js, y una cuenta de Anthropic.
   - `npm install -g @anthropic-ai/claude-code` (verificar comando actual en la docs oficial).
   - Primera vez: `claude` en una terminal abierta en la carpeta del repo.
4. **Anatomía de una conversación**:
   - Pedido claro + contexto + un siguiente paso propuesto.
   - El agente responde con un plan o con cambios.
   - Vos aprobás, ajustás o rechazás.
   - Iterás.
5. **Costo y límites** — qué consume cada mensaje, cómo cuidar la suscripción.
6. **Primera conversación de práctica** — un cambio chico, controlado, reversible.

> Para las **mejores prácticas** y los **anti-patrones** detallados → andá ya al [Módulo 7](/estado-del-sistema/curso/07-skills-mejores-practicas/), que sí está completo.
