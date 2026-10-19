export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { details: err.details || err.stack })
  });
}
