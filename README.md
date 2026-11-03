# TaskFlow

App web para organizar tareas personales. Muestra arriba lo vencido y lo que vence primero, y no te deja tener más de **3 tareas en progreso** al mismo tiempo, para que termines antes de empezar otra.

Proyecto final del bootcamp **Generación T — Stage 2** (programación AI-First).

- **App publicada:** _(se completa al desplegar)_
- **API:** _(se completa al desplegar)_

## Qué hace

- Crear cuenta e iniciar sesión. Cada usuario ve solo sus tareas.
- Crear tareas con prioridad, fecha límite, categoría y descripción.
- Mover las tareas por sus estados: pendiente → en progreso → completada, con la opción de pausar o reabrir.
- Límite de foco: como máximo 3 en progreso. Se respeta aunque lleguen dos pedidos al mismo tiempo.
- Las vencidas se calculan con la fecha de Argentina y aparecen primero.
- Filtros por estado, prioridad, categoría, texto y "solo vencidas", más un resumen con los números.
- Funciona en el celular.

## Documentación

| Documento | Qué tiene |
|---|---|
| [`docs/spec.md`](docs/spec.md) | La spec: problema, usuario y las 24 reglas numeradas (R1–R24) |
| [`docs/plan.md`](docs/plan.md) | Plan técnico: arquitectura en capas, base de datos, API y despliegue |
| [`docs/tareas.md`](docs/tareas.md) | Las tareas en las que dividí el trabajo (un commit por tarea) |
| [`docs/informe-pruebas.md`](docs/informe-pruebas.md) | Informe de pruebas: qué probé, cómo y con qué resultado |
| [`AGENTS.md`](AGENTS.md) | Reglas para los agentes de IA que trabajan en el proyecto |
| [`.cursor/agents/revisor.md`](.cursor/agents/revisor.md) | El agente revisor de seguridad y robustez |

## Tecnología

| Parte | Tecnología | Dónde está publicada |
|---|---|---|
| Frontend | React 18 + Vite | Netlify |
| Backend | Node.js (módulo `http`, sin framework) + `pg` | Render |
| Base de datos | PostgreSQL | Neon |
| Tests | `node:test` | — |

## Cómo correrlo en tu compu

Necesitás Node 20 o más y un PostgreSQL (local o una base gratis de Neon).

```bash
# Backend
cd backend
npm install
cp .env.example .env      # y completá DATABASE_URL
npm run dev               # http://localhost:3000

# Frontend (en otra terminal)
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000
npm run dev               # http://localhost:5173
```

Las tablas se crean solas cuando arranca el backend.

## Tests

```bash
cd backend
npm test                                         # unitarios y de API (con repositorios en memoria)
TEST_DATABASE_URL=postgresql://... npm test      # además, los de integración contra PostgreSQL
```

## API

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/auth/registro` | Crea la cuenta |
| POST | `/api/auth/login` | Inicia sesión |
| GET | `/api/auth/yo` | Usuario actual |
| GET | `/api/tareas` | Lista, con filtros `estado`, `prioridad`, `categoria`, `q` y `vencidas=1` |
| GET | `/api/tareas/resumen` | Cantidades por estado y vencidas |
| POST | `/api/tareas` | Crea una tarea |
| GET / PATCH / DELETE | `/api/tareas/:id` | Ver, editar o eliminar |
| PATCH | `/api/tareas/:id/estado` | Cambiar de estado |

El detalle está en el [plan técnico](docs/plan.md#api).

## Autor

Luis Manuel Rodriguez Marquez — Generación T, Stage 2.
