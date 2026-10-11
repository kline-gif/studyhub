function notFound(req, res, next) {
  const err = new Error('Página no encontrada');
  err.status = 404;
  next(err);
}

// Manejo de errores global
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  if (err.name === 'CastError') {
    status = 404;
    message = 'Recurso no encontrado';
  }
  if (err.code === 11000) {
    status = 409;
    message = 'Ese valor ya está registrado';
  }
  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Error interno del servidor';
  }

  res.status(status).render('error', { title: `Error ${status}`, status, message });
}

module.exports = { notFound, errorHandler };
