// Mensajes flash sin sesiones de servidor: cookie corta de un solo uso
module.exports = function flash(req, res, next) {
  res.locals.flash = null;
  res.locals.errors = [];
  res.locals.old = {};

  const raw = req.cookies && req.cookies.flash;
  if (raw) {
    try {
      res.locals.flash = JSON.parse(raw);
    } catch (e) {
      /* ignorar */
    }
    res.clearCookie('flash');
  }

  res.flash = (type, msg) => {
    res.cookie('flash', JSON.stringify({ type, msg }), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 1000,
    });
  };
  next();
};
