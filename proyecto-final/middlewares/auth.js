const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Se ejecuta en TODAS las peticiones: si hay token válido, expone al usuario a controladores y vistas
async function attachUser(req, res, next) {
  res.locals.currentUser = null;
  const token = req.cookies && req.cookies.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (user) {
      req.user = user;
      res.locals.currentUser = user;
    } else {
      res.clearCookie('token');
    }
  } catch (err) {
    res.clearCookie('token'); // token inválido o expirado
  }
  next();
}

// Ruta privada
function requireAuth(req, res, next) {
  if (!req.user) {
    res.flash('error', 'Debes iniciar sesión para continuar');
    return res.redirect('/auth/login');
  }
  next();
}

// Ruta solo para invitados (login/registro)
function guestOnly(req, res, next) {
  if (req.user) return res.redirect('/dashboard');
  next();
}

// Autorización por rol
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const err = new Error('No tienes permisos para realizar esta acción');
      err.status = 403;
      return next(err);
    }
    next();
  };
}

module.exports = { attachUser, requireAuth, guestOnly, requireRole };
