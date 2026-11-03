# AGENTS.md

## Proyecto

TaskFlow: app web de tareas personales con usuarios, reglas de negocio y base de datos.
La fuente de verdad es [`docs/spec.md`](docs/spec.md). Cada regla tiene un número (R1, R2…).
**Si algo cambia, primero se cambia la spec y después el código. Nunca al revés.**

## Estructura

```
backend/    Node.js sin framework + PostgreSQL (pg)
  src/http/          router, body, CORS, respuestas
  src/controladores/ HTTP → servicio
  src/servicios/     reglas de negocio (acá viven las reglas de la spec)
  src/repositorios/  SQL con parámetros
  src/reloj.js       fecha de hoy en Argentina
  test/              node:test
frontend/   React + Vite
docs/       spec, plan, tareas, informe de pruebas
```

## Comandos

| Dónde | Comando | Qué hace |
|---|---|---|
| backend | `npm install` | Instala `pg` |
| backend | `npm start` | Levanta la API (puerto 3000 o `PORT`) |
| backend | `npm test` | Corre todos los tests |
| frontend | `npm install` | Instala React y Vite |
| frontend | `npm run dev` | Frontend en modo desarrollo |
| frontend | `npm run build` | Genera `dist/` para publicar |

## Reglas para el agente

- Las reglas de negocio van **solo** en `src/servicios`. Los controladores no validan y los repositorios no deciden.
- Todo SQL usa parámetros (`$1`, `$2`…). Nunca concatenar datos del usuario en una consulta.
- Cada regla nueva o cambiada lleva su test, y el nombre del test incluye el número de regla (`R12: …`).
- Para "hoy" se usa siempre el Reloj (`src/reloj.js`), nunca `new Date()` suelto en un servicio.
- Antes de dar algo por terminado: `npm test` en verde.
- Un commit por tarea de `docs/tareas.md`, con el número de tarea en el mensaje.

## Qué NO hacer sin permiso

- No agregar dependencias nuevas. El backend solo usa `pg` y el frontend solo React y Vite.
- No tocar `.env`, credenciales ni la configuración de despliegue.
- No cambiar el formato de las respuestas de la API: el frontend depende de él.
- No hacer push directo a `main` sin que pasen los tests.
- No inventar reglas que no estén en la spec. Si falta una, preguntar.

## Agentes del proyecto

En `.cursor/agents/` está el revisor que armé en el Módulo 3 (TP 6 y 7). Revisa cada cambio antes del commit.
