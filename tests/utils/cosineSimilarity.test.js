const cosineSimilarity = require('../../src/utils/cosineSimilarity');

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('handles zero vectors safely', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('rejects mismatched dimensions', () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow(
      'Vectors must have the same dimensions'
    );
  });

  it('rejects invalid vector values', () => {
    expect(() => cosineSimilarity([1, Number.NaN], [1, 2])).toThrow(
      'vectorA must contain only numbers'
    );
  });
});
