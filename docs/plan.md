# Plan técnico — TaskFlow

Este plan sale de la [spec](spec.md). Si algo cambia, primero se cambia la spec y después el código.

## Arquitectura

```
Navegador ──► Frontend (React, Netlify) ──fetch──► Backend (Node, Render) ──SQL──► PostgreSQL (Neon)
```

El backend está separado en capas, igual que en el TP 4:

| Capa | Carpeta | Qué hace | Qué NO hace |
|---|---|---|---|
| HTTP | `src/http` | Router, leer el body con límite de tamaño, CORS, responder JSON | No conoce reglas de negocio |
| Controladores | `src/controladores` | Traducen el pedido HTTP a una llamada al servicio | No validan reglas ni hablan con la base |
| Servicios | `src/servicios` | Todas las reglas de la spec (validaciones, estados, límite de foco, vencidas, orden) | No saben de HTTP ni de SQL |
| Repositorios | `src/repositorios` | Consultas SQL con parámetros (`$1`, `$2`…) | No deciden nada de negocio |
| Reloj | `src/reloj.js` | Da la fecha de "hoy" en Argentina (R20) | — |

El servicio recibe los repositorios y el Reloj por parámetro. Así, en los tests uso repositorios en memoria y un Reloj fijo, y en producción los de PostgreSQL y el Reloj real.

## Base de datos

```sql
usuarios (id uuid PK, nombre, email UNIQUE en minúsculas, password_hash,
          tareas_en_progreso int CHECK (0..3), creado_en)

tareas   (id uuid PK, usuario_id FK → usuarios ON DELETE CASCADE,
          titulo, descripcion, prioridad, categoria, fecha_limite date,
          estado, creada_en, actualizada_en, completada_en)
```

- Los `CHECK` de la base repiten algunas reglas (prioridad, estado, largo del título) como última barrera, por si algún día otro programa escribe en la base.
- **Límite de foco (R12) con pedidos simultáneos.** Si el servicio cuenta las tareas en progreso y después actualiza, dos pedidos al mismo tiempo pueden contar "2" los dos y quedar 4 en progreso. Para evitarlo, el usuario tiene un contador `tareas_en_progreso` con `CHECK (tareas_en_progreso <= 3)`. El cambio de estado de la tarea y el del contador van en **una sola sentencia SQL**, así que se aplican los dos o ninguno. Si el segundo pedido haría pasar el contador a 4, la base rechaza la sentencia entera por el `CHECK`, y el servicio lo traduce a 409.
- **Cambio de estado.** Se actualiza con `WHERE estado = <estado que leí>`. Si otro pedido la cambió en el medio, no se actualiza nada y respondo 409 ("la tarea cambió, recargá").
- **Fechas.** `fecha_limite` es `date` y se lee como texto (`to_char`) para que no pase por la zona horaria del servidor.

## API

Todas las rutas empiezan con `/api`. Las de tareas necesitan el header `Authorization: Bearer <token>`.

| Método | Ruta | Qué hace | Reglas |
|---|---|---|---|
| GET | `/api/salud` | Chequeo de que el backend está vivo | — |
| POST | `/api/auth/registro` | Crea usuario y devuelve token | R1, R2 |
| POST | `/api/auth/login` | Devuelve token | R3 |
| GET | `/api/auth/yo` | Datos del usuario logueado | R3 |
| GET | `/api/tareas` | Lista con filtros `estado`, `prioridad`, `categoria`, `q`, `vencidas=1` | R4, R15–R17 |
| GET | `/api/tareas/resumen` | Cantidad por estado y vencidas | R19 |
| POST | `/api/tareas` | Crea una tarea | R5–R10 |
| GET | `/api/tareas/:id` | Una tarea | R4 |
| PATCH | `/api/tareas/:id` | Edita título, descripción, prioridad, categoría o fecha | R5–R9, R14 |
| PATCH | `/api/tareas/:id/estado` | Cambia el estado | R11–R13 |
| DELETE | `/api/tareas/:id` | Elimina | R18 |

Ejemplo de tarea en las respuestas:

```json
{
  "id": "6f1c…",
  "titulo": "Entregar TP final",
  "descripcion": "Subir el link del repo al campus",
  "prioridad": "alta",
  "categoria": "Facultad",
  "fechaLimite": "2026-12-31",
  "estado": "en_progreso",
  "vencida": false,
  "creadaEn": "2026-11-03T02:40:00.000Z",
  "completadaEn": null
}
```

## Frontend

- `App.jsx` decide si mostrar la pantalla de acceso o la de tareas, según haya token guardado.
- `api/cliente.js` es el único lugar que hace `fetch`. Agrega el token, convierte errores en mensajes y, si llega un 401, cierra la sesión.
- Cada componente maneja sus tres estados: cargando, salió bien, salió mal.
- La URL del backend sale de `VITE_API_URL`, una variable de entorno de Netlify.

## Despliegue

| Parte | Servicio | Variables de entorno |
|---|---|---|
| Frontend | Netlify — https://taskflow-luis.netlify.app | `VITE_API_URL` |
| Backend | Render — https://taskflow-api-mwor.onrender.com | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` |
| Base | Neon (PostgreSQL) | — |

Las tablas se crean solas cuando arranca el backend (`CREATE TABLE IF NOT EXISTS`), así no hace falta entrar a la base a mano. La configuración de Render está en `render.yaml` y la de Netlify en `netlify.toml`. Los valores secretos se cargan en el panel de cada servicio y no están en el repo (R23). Cada push a `main` vuelve a publicar los dos.

## Cómo pruebo

1. **Tests unitarios** del servicio, con repositorios en memoria y Reloj fijo. Cubren todas las reglas.
2. **Tests de la API** levantando el servidor HTTP con repositorios en memoria: códigos de estado, CORS, límite de tamaño, token.
3. **Tests de integración** contra un PostgreSQL de verdad (se corren si existe `TEST_DATABASE_URL`). Incluyen dos pedidos simultáneos para R12.
4. **Prueba de punta a punta** del frontend con el navegador.
5. **Prueba en producción** con la app publicada.

Los resultados están en el [informe de pruebas](informe-pruebas.md).
