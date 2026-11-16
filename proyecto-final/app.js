require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const connectDB = require('./config/database');
const flash = require('./middlewares/flash');
const { attachUser } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Render está detrás de un proxy (HTTPS automático)
app.set('trust proxy', 1);

// Motor de plantillas + layout base
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Seguridad y parsers
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method')); // permite PUT/DELETE desde formularios HTML
app.use(express.static(path.join(__dirname, 'public')));

// Helpers de formato disponibles en todas las vistas
app.use((req, res, next) => {
  res.locals.fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }) : '';
  res.locals.inputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  res.locals.slug = (t) => String(t || '').toLowerCase().replace(/\s+/g, '-');
  next();
});

// Flash + usuario autenticado disponible en todas las vistas
app.use(flash);
app.use(attachUser);

// Rutas
app.get('/', (req, res) => res.redirect(req.user ? '/dashboard' : '/auth/login'));
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/tasks', require('./routes/tasks'));
app.use('/subjects', require('./routes/subjects'));
app.use('/admin', require('./routes/admin'));

// Errores
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET');
  process.exit(1);
}

connectDB()
  .then(() => app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`)))
  .catch((err) => {
    console.error('❌ Error al conectar con la base de datos:', err.message);
    process.exit(1);
  });

module.exports = app;
