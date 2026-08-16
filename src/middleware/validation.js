const { ValidationError } = require('../utils/errors');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        new ValidationError('Invalid request payload', result.error.flatten())
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
