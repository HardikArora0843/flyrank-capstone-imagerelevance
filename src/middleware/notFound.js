function notFound(req, res) {
  res.status(404).json({
    error: {
      message: 'Resource not found',
      path: req.originalUrl
    }
  });
}

module.exports = notFound;
