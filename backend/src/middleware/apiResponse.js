const apiResponse = (req, res, next) => {
  res.sendSuccess = (payload = {}, message = "Success") =>
    res.json({ success: true, message, ...payload });

  res.sendError = (message = "Error", statusCode = 500, errors = []) =>
    res.status(statusCode).json({ success: false, message, errors });

  next();
};

module.exports = { apiResponse };
