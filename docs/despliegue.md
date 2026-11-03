# Despliegue

Orden: primero la base (Neon), después el backend (Render) y al final el frontend (Netlify). Cada parte necesita la dirección de la anterior.

## 1. Base de datos en Neon

1. En [neon.tech](https://neon.tech), crear un proyecto llamado `taskflow`, en la región más cercana (por ejemplo, São Paulo).
2. En **Connect**, copiar la *connection string*. Tiene esta forma: `postgresql://usuario:clave@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`.
3. No hace falta crear tablas: el backend las crea solo cuando arranca.

## 2. Backend en Render

1. En [render.com](https://render.com), ir a **New → Blueprint** y elegir el repo `TaskFlow`. Render lee el archivo `render.yaml` y arma el servicio `taskflow-api`.
2. Cuando pida las variables, completar:
   - `DATABASE_URL`: la cadena de Neon del paso 1.
   - `FRONTEND_URL`: por ahora `http://localhost:5173`. Se cambia en el paso 3.
   - `JWT_SECRET` se genera solo y `NODE_ENV` ya viene en `production`.
3. Esperar a que termine el deploy y abrir `https://<tu-servicio>.onrender.com/api/salud`. Tiene que responder `{"ok":true}`.

El plan gratis de Render duerme el servicio cuando no se usa. El primer pedido después de un rato tarda entre 30 y 60 segundos, y el frontend muestra un aviso mientras tanto.

## 3. Frontend en Netlify

1. En [netlify.com](https://netlify.com), ir a **Add new site → Import an existing project → GitHub** y elegir `TaskFlow`. Netlify lee el `netlify.toml`: base `frontend`, comando `npm run build`, carpeta `dist`.
2. En **Environment variables**, agregar `VITE_API_URL` con la dirección de Render, sin barra al final (`https://<tu-servicio>.onrender.com`).
3. Hacer el deploy y copiar la dirección del sitio (`https://<tu-sitio>.netlify.app`).
4. Volver a Render y cambiar `FRONTEND_URL` por la dirección de Netlify. Render se reinicia solo. Sin este paso, el navegador bloquea los pedidos por CORS (R24).

## 4. Después

- Cada `git push` a `main` vuelve a publicar Render y Netlify solos.
- Completar las direcciones en el `README.md` y la sección "Pruebas en producción" de [`informe-pruebas.md`](informe-pruebas.md).
