---
title: "8. Git, GitHub y el deploy automático"
description: "Clone, branch, commit, propuesta de cambio. Cómo te ayuda el asistente en cada paso. Cómo el sitio se publica solo."
sidebar:
  order: 8
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía está en borrador. Te dejamos los objetivos y el índice para que veas qué va a haber acá.

## Qué te vas a llevar

- Saber qué hace cada operación de Git sin perderte cuando el asistente las mencione.
- Entender cómo el sitio se reconstruye solo cada noche.
- Saber qué hacer cuando la publicación falla.

## Lo que va a haber acá

### 1. Conceptos clave (ya los vimos en el [Módulo 2](/estado-del-sistema/curso/02-vocabulario/))

- **Repositorio**, "working directory" (los archivos en tu disco), "staging area" (lo que vas a guardar en el próximo commit), **commit**.
- **Branch** (rama) y **merge** (mezclar).
- **Remote** (el `origin` — la copia que vive en GitHub), **push** (subir), **pull** (bajar).
- **Pull Request** (propuesta de cambio).

### 2. Cómo te ayuda el asistente

El asistente ya sabe los comandos. Vos solo tenés que decirle qué querés hacer:

- "Mostrame en qué archivos hay cambios sin guardar" → corre `git status`.
- "Diferencia entre lo que tengo y lo que está en GitHub" → corre `git diff`.
- "Resumime los últimos 20 cambios" → corre `git log`.
- "Hacé un commit con mis cambios y un buen mensaje" → corre `git add` + `git commit`.
- "Abrí la propuesta de cambio en GitHub" → corre `gh pr create`.

### 3. El flujo típico para un cambio chico

```bash
# 1) Crear una rama nueva con un nombre descriptivo
git checkout -b mejora-tal

# 2) Editar (vos, con la ayuda del asistente)
# ...

# 3) Guardar (commit) con un mensaje claro
git add scripts/fetch_weather.py
git commit -m "weather: agregar Rosario al fetcher"

# 4) Subir la rama a GitHub
git push -u origin mejora-tal

# 5) Abrir la propuesta de cambio
gh pr create
```

### 4. La automatización que reconstruye el sitio

El archivo [`.github/workflows/update-data.yml`](https://github.com/mpodeley/estado-del-sistema/blob/master/.github/workflows/update-data.yml) define qué pasa cada noche:

- Se dispara solo todos los días a las 6 AM Argentina (cron `0 9 * * *`).
- También se puede disparar manualmente desde la pestaña "Actions" del repo en GitHub.
- Pasos: prepara Python y Node → corre la pipeline → verifica tipos → arma la web → arma el curso → guarda los datos nuevos → publica todo en GitHub Pages.

### 5. Cuando algo falla

- Mirá el log del Action en la [pestaña "Actions"](https://github.com/mpodeley/estado-del-sistema/actions) del repo.
- Copiá el log entero y pasáselo al asistente: *"este Action falló acá, ¿qué pudo haber pasado?"*.
- Si hace falta, reproducir local: `python scripts/build_data.py`.

### 6. Cosas que **no** hay que hacer

- **`git push --force`** a la rama principal — reescribe la historia, puede borrar trabajo de otra persona.
- **`--no-verify`** en un commit — saltea las verificaciones automáticas que existen por algo.
- **Borrar `public/data/`** para "limpiar" — esos archivos son la data publicada, no son basura.
