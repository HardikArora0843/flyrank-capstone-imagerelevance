const { imageMetadataSchema } = require('../../src/schemas/imageMetadataSchema');

describe('imageMetadataSchema', () => {
  it('accepts valid vision metadata', () => {
    const result = imageMetadataSchema.parse({
      subject: 'red fox',
      category: 'animal',
      attributes: ['orange fur', 'forest'],
      caption: 'A red fox standing in a forest',
      confidence: 0.94
    });

    expect(result.subject).toBe('red fox');
  });

  it('rejects malformed metadata', () => {
    expect(() =>
      imageMetadataSchema.parse({
        subject: 'red fox',
        category: 'animal',
        caption: 'Missing attributes and confidence'
      })
    ).toThrow();
  });

  it('rejects invalid confidence values', () => {
    expect(() =>
      imageMetadataSchema.parse({
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur'],
        caption: 'A red fox',
        confidence: 1.2
      })
    ).toThrow();
  });

  it('rejects extra untrusted fields', () => {
    expect(() =>
      imageMetadataSchema.parse({
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur'],
        caption: 'A red fox',
        confidence: 0.9,
        guessedLocation: 'Canada'
      })
    ).toThrow();
  });
});
