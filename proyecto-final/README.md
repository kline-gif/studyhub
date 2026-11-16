# 🎓 StudyHub — Organizador académico para Ingeniería Informática

Aplicación web full-stack con Node.js, Express y MongoDB (Atlas) para que un estudiante de Informática controle **entregas, exámenes y notas** en un solo sitio.

## Funcionalidades
- Registro y login con JWT (cookie `httpOnly`), contraseñas con bcrypt
- **Dashboard**: tareas pendientes/atrasadas, entregas de los próximos 7 días y nota media ponderada por créditos
- **Tareas** (CRUD completo): prácticas, exámenes, proyectos y lecturas con asignatura, prioridad, estado y fecha de entrega; cambio rápido de estado; búsqueda, filtros y paginación
- **Asignaturas** (CRUD completo) con **calculadora de notas**: añade evaluaciones con su peso (%) y nota, y la app calcula tu media, los puntos aportados y **qué nota necesitas en lo que queda para aprobar** (detecta "imposible aprobar")
- Roles: user (CRUD de sus propios items) y admin (puede ver/borrar todo)
- Vistas dinámicas con EJS (layout + partials), mensajes flash, manejo global de errores
- Desplegada en Vercel.com

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
https://studyhub-three-iota.vercel.app

## Instalación local
1. `npm install`
2. Copia `.env.example` a `.env` y completa `DATABASE_URL` y `JWT_SECRET`
3. `npm start` (o `npm run dev`) → http://localhost:3000

Crear un admin: `npm run create-admin -- admin@correo.com MiPassword123 "Admin"`

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


### Inicio de sesión:

<img width="1300" height="871" alt="Captura de pantalla 2026-11-16 133008" src="https://github.com/user-attachments/assets/f158095b-18ed-46ed-992d-54ca70e321db" />



### Registro:

<img width="1320" height="875" alt="Captura de pantalla 2026-11-16 133039" src="https://github.com/user-attachments/assets/72ffbe67-bbc9-429e-9113-9bdfdf7a6c81" />



### Inicio:

<img width="1406" height="865" alt="Captura de pantalla 2026-11-16 132720" src="https://github.com/user-attachments/assets/faf05f15-51fd-4c97-a073-08bc66aded5b" />



### Sección "Mis Tareas":

<img width="1376" height="872" alt="Captura de pantalla 2026-11-16 132851" src="https://github.com/user-attachments/assets/48e6cb29-7f34-4a2f-b0fe-9228cdc3e258" />



### Sección "Mis Asignaturas":

<img width="1410" height="872" alt="Captura de pantalla 2026-11-16 132923" src="https://github.com/user-attachments/assets/d5a9fd52-27d0-45a5-a1f5-48f59ca37eca" />



### Panel de Admin:

<img width="1506" height="872" alt="Captura de pantalla 2026-11-16 132252" src="https://github.com/user-attachments/assets/556016bc-6c54-48b9-8b47-a91c4cab930c" />





