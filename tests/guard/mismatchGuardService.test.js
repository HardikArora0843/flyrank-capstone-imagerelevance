const mismatchGuardService = require('../../src/services/mismatchGuardService');

const redFoxPost = {
  subject: 'red fox',
  category: 'animal'
};

describe('mismatchGuardService', () => {
  it('accepts a strong fox candidate for a fox article', () => {
    const result = mismatchGuardService.evaluateCandidate(
      {
        post: redFoxPost,
        image: {
          subject: 'red fox',
          category: 'animal',
          confidence: 0.94
        },
        similarityScore: 0.91
      },
      {
        similarityThreshold: 0.75,
        visionConfidenceThreshold: 0.7
      }
    );

    expect(result.guardStatus).toBe('accepted');
    expect(result.decision).toBe('recommended');
  });

  it('rejects a wolf candidate for a fox article without a special case', () => {
    const result = mismatchGuardService.evaluateCandidate(
      {
        post: redFoxPost,
        image: {
          subject: 'gray wolf',
          category: 'animal',
          confidence: 0.95
        },
        similarityScore: 0.93
      },
      {
        similarityThreshold: 0.75,
        visionConfidenceThreshold: 0.7
      }
    );

    expect(result.guardStatus).toBe('rejected');
    expect(result.decisionReason).toContain(
      'Subject mismatch: expected red fox, detected gray wolf'
    );
  });

  it('rejects low-confidence images', () => {
    const result = mismatchGuardService.evaluateCandidate(
      {
        post: redFoxPost,
        image: {
          subject: 'red fox',
          category: 'animal',
          confidence: 0.42
        },
        similarityScore: 0.9
      },
      {
        similarityThreshold: 0.75,
        visionConfidenceThreshold: 0.7
      }
    );

    expect(result.guardStatus).toBe('rejected');
    expect(result.decisionReason).toContain('Image confidence 0.42 is below threshold 0.7');
  });

  it('rejects low similarity', () => {
    const result = mismatchGuardService.evaluateCandidate(
      {
        post: redFoxPost,
        image: {
          subject: 'red fox',
          category: 'animal',
          confidence: 0.95
        },
        similarityScore: 0.2
      },
      {
        similarityThreshold: 0.75,
        visionConfidenceThreshold: 0.7
      }
    );

    expect(result.guardStatus).toBe('rejected');
    expect(result.decisionReason).toContain('Similarity 0.200 is below threshold 0.75');
  });

  it('rejects category mismatches', () => {
    const result = mismatchGuardService.evaluateCandidate(
      {
        post: redFoxPost,
        image: {
          subject: 'red fox plush toy',
          category: 'product',
          confidence: 0.95
        },
        similarityScore: 0.9
      },
      {
        similarityThreshold: 0.75,
        visionConfidenceThreshold: 0.7
      }
    );

    expect(result.guardStatus).toBe('rejected');
    expect(result.decisionReason).toContain('Category mismatch: expected animal, detected product');
  });

  it('accepts compatible plural subject variations', () => {
    expect(
      mismatchGuardService.areSubjectsCompatible('red foxes', 'red fox')
    ).toBe(true);
  });
});
