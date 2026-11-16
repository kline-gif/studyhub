# 🎓 StudyHub — Organizador académico para Ingeniería Informática

Aplicación web full-stack con Node.js, Express y MongoDB (Atlas) para que un estudiante de Informática controle **entregas, exámenes y notas** en un solo sitio.

## Funcionalidades
- Registro y login con JWT (cookie `httpOnly`), contraseñas con bcrypt
- **Dashboard**: tareas pendientes/atrasadas, entregas de los próximos 7 días y nota media ponderada por créditos
- **Tareas** (CRUD completo): prácticas, exámenes, proyectos y lecturas con asignatura, prioridad, estado y fecha de entrega; cambio rápido de estado; búsqueda, filtros y paginación
- **Asignaturas** (CRUD completo) con **calculadora de notas**: añade evaluaciones con su peso (%) y nota, y la app calcula tu media, los puntos aportados y **qué nota necesitas en lo que queda para aprobar** (detecta "imposible aprobar")
- Roles: user (CRUD de sus propios items) y admin (puede ver/borrar todo)
- Vistas dinámicas con EJS (layout + partials), mensajes flash, manejo global de errores
- Desplegada en Render.com

## Tecnologías
Node.js 20+ · Express 4 · Mongoose · JWT + bcrypt(js) · EJS + express-ejs-layouts · Helmet · express-validator · express-rate-limit · method-override

## Arquitectura (MVC)
```
config/       conexión a la base de datos
models/       User, Subject, Task: esquemas + lógica de negocio (permisos, cálculo de notas, búsquedas, dashboard)
controllers/  auth, dashboard, task, subject: orquestan req/res
routes/       endpoints y middlewares
middlewares/  auth (JWT + roles), flash, validators, errorHandler
views/        layouts, partials, auth, dashboard, tasks, subjects, error.ejs
public/       css y js
```

## Enlace en producción
https://tu-app.onrender.com  ← *(reemplazar tras el despliegue)*

## Instalación local
1. `npm install`
2. Copia `.env.example` a `.env` y completa `DATABASE_URL` y `JWT_SECRET`
3. `npm start` (o `npm run dev`) → http://localhost:3000

Crear un admin: `npm run create-admin -- admin@correo.com MiPassword123 "Admin"`

## Despliegue en Render
1. Sube el repo a GitHub.
2. MongoDB Atlas: cluster gratuito, usuario de BD y *Network Access* `0.0.0.0/0`; copia la cadena de conexión.
3. Render → **New → Web Service** → conecta el repo. Build: `npm install` · Start: `npm start`.
4. Variables de entorno: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`.
5. HTTPS es automático. Copia la URL pública aquí arriba.
(También se incluye `render.yaml`.)

## Rutas
| Ruta | Descripción | Acceso |
|---|---|---|
| `/auth/register`, `/auth/login`, `POST /auth/logout` | Autenticación | público / autenticado |
| `/dashboard` | Resumen | autenticado |
| `/tasks` (+ `/new`, `/:id`, `/:id/edit`, `PATCH /:id/status`) | CRUD de tareas | dueño; admin ve y borra |
| `/subjects` (+ `/new`, `/:id`, `/:id/edit`) | CRUD de asignaturas | dueño; admin ve y borra |
| `POST /subjects/:id/evaluations`, `DELETE /subjects/:id/evaluations/:evalId` | Evaluaciones y notas | dueño |
| `GET /admin` (+ `DELETE /admin/users/:id`, `/admin/subjects/:id`, `/admin/tasks/:id`) | Panel de administración: todos los usuarios, asignaturas y tareas | solo admin (sin sesión → login; usuario normal → 403) |

## Capturas
*(añade una captura o enlace a un video corto)*
