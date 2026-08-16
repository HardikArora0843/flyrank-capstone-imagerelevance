const { z } = require('zod');

const validate = require('../../src/middleware/validation');

describe('validation middleware', () => {
  it('writes parsed data back to the request source', () => {
    const middleware = validate(
      z.object({
        limit: z.coerce.number().int().positive()
      }),
      'query'
    );
    const req = { query: { limit: '5' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(req.query).toEqual({ limit: 5 });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes validation errors to next', () => {
    const middleware = validate(
      z.object({
        title: z.string().min(1)
      })
    );
    const req = { body: { title: '' } };
    const next = jest.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        statusCode: 400
      })
    );
  });
});
