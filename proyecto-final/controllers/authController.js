const { validationResult } = require('express-validator');
const User = require('../models/User');

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
});

exports.showRegister = (req, res) => res.render('auth/register', { title: 'Registro' });
exports.showLogin = (req, res) => res.render('auth/login', { title: 'Iniciar sesión' });

exports.register = async (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).render('auth/register', {
        title: 'Registro',
        errors: result.array(),
        old: req.body,
      });
    }
    const user = await User.register(req.body);
    res.cookie('token', user.generateToken(), cookieOptions());
    res.flash('success', `¡Bienvenido, ${user.name}!`);
    res.redirect('/dashboard');
  } catch (err) {
    if (err.code === 11000) {
      return res.status(422).render('auth/register', {
        title: 'Registro',
        errors: [{ msg: 'Ese email ya está registrado' }],
        old: req.body,
      });
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).render('auth/login', {
        title: 'Iniciar sesión',
        errors: result.array(),
        old: req.body,
      });
    }
    const user = await User.authenticate(req.body.email, req.body.password);
    if (!user) {
      return res.status(401).render('auth/login', {
        title: 'Iniciar sesión',
        errors: [{ msg: 'Credenciales incorrectas' }],
        old: req.body,
      });
    }
    res.cookie('token', user.generateToken(), cookieOptions());
    res.flash('success', `Hola de nuevo, ${user.name}`);
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('token');
  res.flash('success', 'Sesión cerrada');
  res.redirect('/auth/login');
};
