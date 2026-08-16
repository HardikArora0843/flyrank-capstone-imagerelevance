jest.mock('../../src/models/Post', () => ({
  findById: jest.fn()
}));

jest.mock('../../src/models/Image', () => ({
  find: jest.fn()
}));

jest.mock('../../src/models/Suggestion', () => ({
  create: jest.fn()
}));

jest.mock('../../src/services/embeddingService', () => ({
  generatePostEmbedding: jest.fn()
}));

const Image = require('../../src/models/Image');
const Post = require('../../src/models/Post');
const Suggestion = require('../../src/models/Suggestion');
const matchingService = require('../../src/services/matchingService');

function post(overrides = {}) {
  return {
    _id: 'post-1',
    subject: 'red fox',
    category: 'animal',
    embedding: [1, 0],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function image(overrides = {}) {
  return {
    _id: overrides._id || 'image-1',
    subject: 'red fox',
    category: 'animal',
    confidence: 0.95,
    cloudinaryUrl: 'https://example.com/image.jpg',
    embedding: [1, 0],
    ...overrides
  };
}

describe('matchingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Suggestion.create.mockImplementation(async (data) => ({
      _id: `suggestion-${Suggestion.create.mock.calls.length}`,
      ...data
    }));
  });

  it('ranks candidates by cosine similarity and returns accepted matches', async () => {
    Post.findById.mockResolvedValue(post());
    Image.find.mockResolvedValue([
      image({ _id: 'fox-low', embedding: [0.8, 0.2] }),
      image({ _id: 'fox-high', embedding: [1, 0] })
    ]);

    const result = await matchingService.matchImagesForPost('post-1');

    expect(result.status).toBe('matched');
    expect(result.suggestions.map((item) => item.imageId)).toEqual([
      'fox-high',
      'fox-low'
    ]);
  });

  it('rejects wolf candidates for fox posts and returns no_confident_match', async () => {
    Post.findById.mockResolvedValue(post());
    Image.find.mockResolvedValue([
      image({
        _id: 'wolf-1',
        subject: 'gray wolf',
        category: 'animal',
        confidence: 0.96,
        embedding: [1, 0]
      })
    ]);

    const result = await matchingService.matchImagesForPost('post-1', {
      candidateImageIds: ['wolf-1']
    });

    expect(result.status).toBe('no_confident_match');
    expect(result.suggestions).toEqual([]);
    expect(result.rejectedCandidates[0].reason).toContain(
      'Subject mismatch: expected red fox, detected gray wolf'
    );
  });

  it('returns no_confident_match when no candidates are available', async () => {
    Post.findById.mockResolvedValue(post());
    Image.find.mockResolvedValue([]);

    const result = await matchingService.matchImagesForPost('post-1');

    expect(result.status).toBe('no_confident_match');
    expect(result.reasons).toContain('No completed images with embeddings were available');
  });

  it('generates and stores a missing post embedding before matching', async () => {
    const postWithoutEmbedding = post({ embedding: [] });
    const embeddingService = require('../../src/services/embeddingService');
    embeddingService.generatePostEmbedding.mockResolvedValue({
      embedding: [1, 0],
      model: 'text-embedding-004'
    });
    Post.findById.mockResolvedValue(postWithoutEmbedding);
    Image.find.mockResolvedValue([image()]);

    const result = await matchingService.matchImagesForPost('post-1');

    expect(result.status).toBe('matched');
    expect(postWithoutEmbedding.embedding).toEqual([1, 0]);
    expect(postWithoutEmbedding.save).toHaveBeenCalledTimes(1);
  });
});
