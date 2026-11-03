# SPEC — TaskFlow

## Objetivo

TaskFlow es una app web para organizar tareas personales (facultad, trabajo, casa).
Arrancó en el Módulo 2 como un frontend en React que guardaba todo en memoria y se
perdía al refrescar. En el Módulo 3 le hice un backend básico con un archivo JSON.
Este es el proyecto final: la app completa, con usuarios, base de datos real,
reglas de negocio, tests y publicada en internet.

## Usuario

Una persona que tiene varias cosas para hacer al mismo tiempo y se le pasan las fechas.
Por ejemplo, un estudiante que trabaja: tiene entregas de la facultad, cosas del laburo y
trámites. Entra desde la compu o el celular, carga sus tareas y quiere ver primero lo
que está vencido o por vencer.

## El problema que resuelve

Una lista de tareas común no ayuda a priorizar: todo tiene el mismo peso, uno empieza
diez cosas y no termina ninguna, y las fechas se pasan sin darse cuenta.
TaskFlow agrega tres cosas:

1. Muestra arriba lo vencido y lo que vence primero.
2. Limita cuántas tareas podés tener "en progreso" al mismo tiempo, para obligarte a terminar antes de empezar otra.
3. Cada tarea pasa por estados con un orden lógico.

## Reglas de negocio

Cada regla tiene un número. Los tests y el código hacen referencia a estos números.

### Usuarios

- **R1. Registro.** Nombre de 2 a 60 caracteres, email válido y contraseña de al menos 8 caracteres con al menos una letra y un número. El email no se puede repetir y no distingue mayúsculas (`Luis@Mail.com` y `luis@mail.com` son el mismo).
- **R2. Contraseñas.** Se guardan con hash (scrypt con sal). Nunca se guardan en texto plano ni se devuelven en ninguna respuesta.
- **R3. Login.** Con email y contraseña se obtiene un token que dura 7 días. Si el email o la contraseña están mal, el mensaje es el mismo para los dos casos ("Email o contraseña incorrectos"), así no se puede averiguar qué emails están registrados.
- **R4. Privacidad.** Cada usuario solo ve y modifica sus propias tareas. Si alguien pide una tarea de otro usuario, la respuesta es 404, como si no existiera.

### Tareas

- **R5. Título.** Obligatorio, de 1 a 100 caracteres después de sacar los espacios de los costados.
- **R6. Descripción.** Opcional, hasta 500 caracteres.
- **R7. Prioridad.** `alta`, `media` o `baja`. Si no se indica, es `media`.
- **R8. Categoría.** Opcional, texto libre de hasta 30 caracteres (por ejemplo "Facultad").
- **R9. Fecha límite.** Opcional, con formato `AAAA-MM-DD`. Cuando se crea la tarea o se cambia la fecha, no puede ser anterior a hoy (hoy en hora de Argentina, ver R20).
- **R10. Estado inicial.** Toda tarea nueva arranca en `pendiente`.

### Estados

- **R11. Transiciones.** Solo se permiten estos cambios:

  | Desde | Hacia | Para qué |
  |---|---|---|
  | pendiente | en_progreso | Empezarla |
  | en_progreso | pendiente | Pausarla |
  | en_progreso | completada | Terminarla |
  | completada | pendiente | Reabrirla |

  Cualquier otro cambio responde 409. No se puede pasar de `pendiente` a `completada` directo: primero hay que empezarla.
- **R12. Límite de foco.** Un usuario puede tener como máximo **3 tareas en progreso** al mismo tiempo. Si quiere empezar una cuarta, responde 409 y le pide terminar o pausar otra. La regla se tiene que cumplir aunque lleguen dos pedidos exactamente al mismo tiempo.
- **R13. Fecha de finalización.** Al completar una tarea se guarda cuándo se completó. Si se reabre, ese dato se borra.
- **R14. Completadas no se editan.** Una tarea completada no se puede modificar (título, descripción, etc.). Para cambiarla, primero hay que reabrirla.

### Vencimiento y orden

- **R15. Vencida.** Una tarea está vencida si tiene fecha límite, esa fecha es anterior a hoy y no está completada. Una tarea que vence **hoy** todavía no está vencida. "Vencida" se calcula en el momento; no se guarda en la base.
- **R16. Orden de la lista.** Primero las vencidas, después por fecha límite más cercana (las que no tienen fecha van al final), después por prioridad (alta, media, baja) y por último las más nuevas.
- **R17. Filtros.** La lista se puede filtrar por estado, prioridad, categoría, texto (busca en título y descripción sin distinguir mayúsculas) y "solo vencidas". Los filtros se pueden combinar.
- **R18. Eliminar.** Solo se pueden eliminar tareas propias. Si la tarea estaba en progreso, libera su lugar en el límite de R12.
- **R19. Resumen.** Hay un resumen con la cantidad de tareas en cada estado y cuántas están vencidas.

### Reglas técnicas

- **R20. El Reloj.** Las fechas de "hoy" se calculan en hora de Argentina (`America/Argentina/Buenos_Aires`), no en la hora del servidor, que en la nube está en UTC. Ejemplo: el 21/10 a las 22:30 en Argentina ya es 22/10 en UTC, pero para la app sigue siendo 21/10.
- **R21. Pedidos.** Un pedido con más de 100 KB responde 413. Un JSON mal formado responde 400.
- **R22. Errores.** 400 para datos inválidos, 401 sin sesión o con sesión vencida, 404 si no existe, 409 si rompe una regla de negocio, 413 si el pedido es muy grande, 500 para errores internos (sin mostrar detalles del servidor).
- **R23. Secretos.** Claves y cadenas de conexión solo en variables de entorno. El `.env` nunca se sube al repositorio.
- **R24. CORS.** El backend solo acepta pedidos del navegador que vengan de la dirección del frontend (`FRONTEND_URL`).

## Restricciones

- Nada de pagos, notificaciones por mail ni tareas compartidas entre usuarios. Quedan para una versión futura.
- La app tiene que funcionar en el celular (diseño responsive).
- Pocas dependencias: el backend usa Node sin framework y solo agrega `pg` para hablar con PostgreSQL. El frontend usa React + Vite.

## Tecnología

| Parte | Tecnología | Dónde se publica |
|---|---|---|
| Frontend | React 18 + Vite | Netlify |
| Backend | Node.js 20+ (módulo `http`) | Render |
| Base de datos | PostgreSQL | Neon |
| Tests | `node:test` (viene con Node) | — |
