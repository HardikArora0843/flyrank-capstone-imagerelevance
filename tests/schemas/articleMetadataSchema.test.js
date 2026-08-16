const { articleMetadataSchema } = require('../../src/schemas/articleMetadataSchema');

describe('articleMetadataSchema', () => {
  it('accepts valid article metadata', () => {
    const metadata = articleMetadataSchema.parse({
      subject: 'red fox',
      category: 'animal',
      keywords: ['fox', 'wildlife', 'habitat']
    });

    expect(metadata.subject).toBe('red fox');
  });

  it('rejects missing keywords', () => {
    expect(() =>
      articleMetadataSchema.parse({
        subject: 'red fox',
        category: 'animal'
      })
    ).toThrow();
  });

  it('rejects untrusted extra fields', () => {
    expect(() =>
      articleMetadataSchema.parse({
        subject: 'red fox',
        category: 'animal',
        keywords: ['fox'],
        confidence: 0.99
      })
    ).toThrow();
  });
});
