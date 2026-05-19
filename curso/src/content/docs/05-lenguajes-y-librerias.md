---
title: "5. Lenguajes y librerías"
description: "Python, TypeScript, React, Recharts, Vite — y por qué cada uno es lo que es."
sidebar:
  order: 5
  badge:
    text: Borrador
    variant: caution
---

> **Próximamente** — este módulo todavía no está escrito a fondo. Acá quedan los objetivos y un sumario para que sepas qué esperar.

## Objetivos de aprendizaje

- Saber para qué sirve cada lenguaje y cada librería que usa este proyecto.
- Tener una analogía Excel por cada uno, para que cuando escuches el nombre tengas una intuición.

## Sumario

### Python (la pipeline)

- **`requests`** — hacer pedidos HTTP. *Como `=SERVICIOWEB(...)` pero más potente.*
- **`beautifulsoup4`** — leer HTML scrapeado (buscar enlaces, tablas).
- **`pdfplumber`** — extraer texto y tablas de PDFs. *Como abrir un PDF y copiar la tabla, pero programable.*
- **`openpyxl`** / **`xlrd`** — leer y escribir Excels.
- **`msoffcrypto-tool`** — desencriptar Office "protegidos" con password (CAMMESA usa el password default de Excel, `VelvetSweatshop`).

Ver dónde se usan: [`requirements.txt`](https://github.com/mpodeley/estado-del-sistema/blob/master/requirements.txt) y los scripts en [`scripts/`](https://github.com/mpodeley/estado-del-sistema/tree/master/scripts).

### TypeScript (el frontend)

- **TypeScript** vs JavaScript — TS es JS con tipos. Te avisa antes de correr si pasaste un número donde esperaba un string. Para una app de datos donde una columna mal nombrada rompe un gráfico, vale oro.
- **React** — librería para construir UIs como un árbol de componentes. *Cada componente es como una "subhoja" reusable de Excel.*
- **Recharts** — librería de gráficos basada en React. Por qué ésta y no Highcharts/Plotly: simple, buena para series temporales, sin licencia.
- **Vite** — la herramienta que arma todo y lo sirve en dev. *El "compilador" del lado JS.*

Ver: [`package.json`](https://github.com/mpodeley/estado-del-sistema/blob/master/package.json), [`tsconfig.json`](https://github.com/mpodeley/estado-del-sistema/blob/master/tsconfig.json), [`vite.config.ts`](https://github.com/mpodeley/estado-del-sistema/blob/master/vite.config.ts).

### ¿Por qué dos lenguajes?

Porque cada uno es bueno para algo distinto:
- Python tiene el mejor ecosistema para *traer y procesar datos* (PDFs, Excel, APIs).
- TypeScript/React tienen el mejor ecosistema para *mostrar datos en el browser*.

Y el contrato JSON entre ellos (Módulo 3) hace que la convivencia no sea un problema.
