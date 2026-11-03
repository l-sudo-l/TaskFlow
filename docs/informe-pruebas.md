# Informe de pruebas — TaskFlow

## Resumen

| Tipo de prueba | Cantidad | Resultado |
|---|---|---|
| Unitarias del servicio de usuarios (R1–R3) | 9 | ✅ Pasan |
| Unitarias del servicio de tareas (R4–R19) | 29 | ✅ Pasan |
| Reloj en hora de Argentina (R20) | 3 | ✅ Pasan |
| API HTTP: rutas, códigos, CORS, límites (R21–R24) | 22 | ✅ Pasan |
| Integración contra PostgreSQL real, con pedidos simultáneos | 7 | ✅ Pasan |
| **Total backend (`npm test`)** | **70** | **✅ 70/70** |
| De punta a punta en el navegador (frontend + backend + base) | 18 chequeos | ✅ 18/18 |
| En producción (Netlify + Render + Neon) | — | Ver la última sección |

Los tests de integración usan un PostgreSQL 16 local, la misma versión de motor que da Neon.

## Cómo se corren

```bash
cd backend
npm test                                            # 63 tests; los 7 de integración se saltean
TEST_DATABASE_URL=postgresql://... npm test         # los 70
```

## Qué cubre cada regla

| Regla | Qué se probó | Dónde |
|---|---|---|
| R1 | Registro válido; email repetido sin importar mayúsculas (409); nombre, email y contraseña inválidos (400); dos registros simultáneos con el mismo email → solo uno se crea | `authServicio.test.js`, `apiAuth.test.js`, `integracion.test.js` |
| R2 | El hash empieza con `scrypt$`, no contiene la contraseña, y la misma contraseña da hashes distintos por la sal | `authServicio.test.js` |
| R3 | Login correcto; mismo mensaje si falla el email o la contraseña; token válido hasta los 7 días y vencido después; token modificado, inventado o firmado con otra clave → 401 | `authServicio.test.js`, `apiAuth.test.js` |
| R4 | Otro usuario no puede ver, editar, mover ni borrar una tarea ajena (404), probado también contra PostgreSQL | `tareaServicio.test.js`, `apiTareas.test.js`, `integracion.test.js` |
| R5–R8 | Título obligatorio (vacío, solo espacios, número, 101 caracteres); descripción de hasta 500; categoría de hasta 30; prioridad solo alta, media o baja | `tareaServicio.test.js` |
| R9 | Formato de fecha, fechas imposibles (30/02, mes 13), no anterior a hoy. A las 22:30 del 2/11 en Argentina se acepta el 2/11 aunque en UTC ya sea 3/11. Al editar se puede dejar la fecha vieja o sacarla | `tareaServicio.test.js` |
| R10 | Aunque se mande `estado: "completada"`, la tarea nueva queda pendiente | `tareaServicio.test.js` |
| R11 | El ciclo permitido funciona; pendiente → completada y completada → en progreso dan 409; un estado inexistente da 400 | `tareaServicio.test.js`, `apiTareas.test.js` |
| R12 | La cuarta en progreso da 409; pausar, completar o borrar libera el lugar; el límite es por usuario | `tareaServicio.test.js` |
| R12 con pedidos simultáneos | Con 2 en progreso, 2 pedidos a la vez → uno 200 y otro 409. Con 10 pedidos a la vez sobre 10 tareas → exactamente 3 en progreso. La misma tarea empezada 3 veces a la vez → el contador suma 1. En todos los casos, el contador coincide con las tareas reales | `integracion.test.js` |
| R13 | Al completar se guarda la fecha; al reabrir se borra | `tareaServicio.test.js` |
| R14 | Una completada no se edita (409) hasta reabrirla | `tareaServicio.test.js`, `integracion.test.js` |
| R15 | Vencida si la fecha ya pasó; la que vence hoy no; la completada no. A las 22:00 del día del vencimiento, en Argentina todavía no está vencida | `tareaServicio.test.js` |
| R16 | Orden con 7 tareas que cubren todos los casos | `tareaServicio.test.js` |
| R17 | Cada filtro, combinaciones, búsqueda sin distinguir mayúsculas, búsqueda con `%` y `_` como texto literal, filtros inválidos (400) | `tareaServicio.test.js`, `integracion.test.js` |
| R18 | Borrar la propia (204), borrar la ajena o una inexistente (404), y que se libere el cupo | `tareaServicio.test.js`, `apiTareas.test.js` |
| R19 | Conteo por estado y vencidas, sin mezclar usuarios | `tareaServicio.test.js` |
| R20 | 22:30 del 21/10 en Argentina = 21/10, aunque en UTC sea 22/10; el cambio de día en Argentina | `reloj.test.js` |
| R21 | Pedido de más de 100 KB → 413; JSON roto → 400; acentos y emojis llegan bien | `apiSeguridad.test.js` |
| R22 | Un error interno responde 500 genérico, sin el mensaje de la base | `apiSeguridad.test.js` |
| R23 | En producción el servidor no arranca sin `JWT_SECRET`; los CHECK de la base frenan datos inválidos | `apiSeguridad.test.js`, `integracion.test.js` |
| R24 | CORS habilita solo los orígenes configurados; el preflight responde 204 | `apiSeguridad.test.js` |

## Prueba de punta a punta en el navegador

Levanté el backend con PostgreSQL y el frontend, y recorrí la app con un navegador automático (Playwright). Resultado:

| # | Qué hice | Resultado |
|---|---|---|
| 1 | Crear cuenta con una contraseña sin números | ✅ Muestra "La contraseña tiene que tener al menos una letra y un número" |
| 2 | Crear cuenta válida | ✅ Entra y muestra "No tenés tareas todavía" |
| 3 | Recargar la página | ✅ Sigue con la sesión iniciada |
| 4 | Login con un email que no existe | ✅ "Email o contraseña incorrectos" |
| 5 | Crear tarea con prioridad alta, fecha de hoy y categoría | ✅ Aparece con la etiqueta "Vence hoy" |
| 6 | Crear tarea con título vacío | ✅ "El título es obligatorio" |
| 7 | Empezar 3 tareas y después una cuarta | ✅ La cuarta muestra "Ya tenés 3 tareas en progreso…" y el resumen marca 3/3 |
| 8 | Completar una | ✅ Desaparece el botón Editar y aparece Reabrir |
| 9 | Empezar la cuarta después de completar una | ✅ Ahora se puede |
| 10 | Editar título y prioridad | ✅ Se guarda |
| 11 | Buscar "física" (el título dice "Física") | ✅ Queda 1 |
| 12 | Filtrar por completadas | ✅ Queda 1 |
| 13 | Filtrar por categoría "FACULTAD" (guardada como "Facultad") | ✅ Queda 1 |
| 14 | Eliminar y responder "No" | ✅ No la borra |
| 15 | Eliminar y responder "Sí" | ✅ La borra |
| 16 | Tarea con fecha 30/10 vista el 2/11 | ✅ Aparece primera, con la etiqueta "Vencida" y "Venció hace 3 días" |
| 17 | Tocar "Vencidas" en el resumen | ✅ Filtra y queda solo esa |
| 18 | Ver la app con ancho de celular (390 px) | ✅ Sin scroll horizontal y sin errores en la consola |

## Errores que encontraron las pruebas

1. **Tipos de parámetros inconsistentes en el cambio de estado.** La consulta usaba `$3` en `SET estado = $3` y en `CASE WHEN $3 = 'completada'`. PostgreSQL respondió `inconsistent types deduced for parameter $3` (código 42P08). Con los repositorios en memoria no se veía; apareció recién al probar contra PostgreSQL. Lo arreglé con un cast explícito (`$3::varchar`). Esto confirma por qué hacen falta los tests de integración y no alcanza con los unitarios.
2. **Test de integración que adelantaba el reloj 8 días.** Falló con 401 porque el token dura 7 días (R3). El error estaba en el test, no en el código, así que cambié la fecha del test a 4 días.
3. **CHECK de prioridad.** El test esperaba el código 23514 (CHECK) al insertar la prioridad `'urgente'`, pero la base respondió 22001 porque la columna es `varchar(5)` y la palabra no entra. Usé un valor corto para probar el CHECK de verdad.
4. **Formulario de nueva tarea.** Después de crear una tarea, la categoría quedaba cargada y se arrastraba a las siguientes. En la prueba de punta a punta, el filtro por categoría devolvía tareas de más. Ahora el formulario se limpia completo.
5. **Botones bloqueados después de una acción.** En `TareaItem`, `ocupado` solo volvía a `false` si había error. Si la acción salía bien y la tarea seguía en la lista, los botones quedaban deshabilitados. Lo pasé a `finally`.

## Pruebas en producción

_Completar después de publicar (ver [despliegue.md](despliegue.md))._

| # | Qué probar | Resultado |
|---|---|---|
| 1 | `GET https://<render>/api/salud` responde `{"ok":true}` | |
| 2 | Abrir la app de Netlify, crear cuenta e iniciar sesión | |
| 3 | Crear tareas, empezar 3 y verificar que la cuarta da el aviso del límite | |
| 4 | Recargar la página y comprobar que las tareas siguen (quedan guardadas en Neon) | |
| 5 | Abrir la app desde el celular | |
| 6 | Después de 15 minutos sin uso, el primer pedido muestra "Despertando el servidor…" y después carga | |
