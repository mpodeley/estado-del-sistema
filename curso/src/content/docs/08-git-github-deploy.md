---
title: "8. Git, GitHub y el deploy automático"
description: "Clone, branch, commit, PR. Cómo el agente te asiste en cada paso. Cómo funciona la GitHub Action."
sidebar:
  order: 8
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Saber qué es cada operación de git sin perderte cuando el agente las mencione.
- Entender cómo el sitio se reconstruye solo cada noche.
- Saber qué hacer cuando el deploy falla.

## Sumario

1. **Conceptos clave** (ya los vimos en el [Módulo 2](/estado-del-sistema/curso/02-vocabulario/)):
   - Repositorio, working directory, staging area, commit.
   - Branch (rama) y merge.
   - Remote (`origin`), push, pull, fetch.
   - Pull Request.
2. **Cómo el agente te ayuda** — `git status`, `git diff`, `git log`, crear commits con mensajes adecuados, abrir PRs con `gh pr create`.
3. **Workflow típico para un cambio chico**:
   ```
   git checkout -b mejora-tal
   ... editás (con el agente) ...
   git add ...
   git commit -m "mejora tal: ..."
   git push -u origin mejora-tal
   gh pr create ...
   ```
4. **La GitHub Action que reconstruye el sitio** — [`.github/workflows/update-data.yml`](https://github.com/mpodeley/estado-del-sistema/blob/master/.github/workflows/update-data.yml):
   - Trigger: cron `0 9 * * *` (6 AM Argentina) + manual.
   - Pasos: setup Python+Node → pipeline → typecheck → build → commit de `public/data/` → deploy a Pages.
5. **Cuando algo falla**:
   - Mirar el log del Action en GitHub (pestaña "Actions").
   - Pasarle el log al agente y pedirle diagnóstico.
   - Si hace falta, correr la pipeline local (`python scripts/build_data.py`) para reproducir.
6. **Cosas a NO hacer**:
   - `git push --force` a master.
   - `--no-verify` para saltarse hooks.
   - Borrar `public/data/` para "limpiar".
