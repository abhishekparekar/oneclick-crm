const notFound = (req, res, next) => {
  console.warn(`[404] Not Found - ${req.method} ${req.originalUrl}`);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error("[Error Handler] Exception caught:", {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    errors: err.errors || [],
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
