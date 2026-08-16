const request = require('supertest');

jest.mock('../../src/services/matchingService', () => ({
  matchImagesForPost: jest.fn()
}));

const app = require('../../src/app');
const matchingService = require('../../src/services/matchingService');

describe('GET /api/posts/:id/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns matching results', async () => {
    matchingService.matchImagesForPost.mockResolvedValue({
      postId: 'post-1',
      status: 'matched',
      suggestions: [
        {
          imageId: 'image-1',
          similarityScore: 0.91,
          guardStatus: 'accepted'
        }
      ]
    });

    const response = await request(app).get('/api/posts/post-1/images');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('matched');
    expect(matchingService.matchImagesForPost).toHaveBeenCalledWith('post-1', {});
  });

  it('passes forced candidate IDs from query string', async () => {
    matchingService.matchImagesForPost.mockResolvedValue({
      postId: 'post-1',
      status: 'no_confident_match',
      suggestions: []
    });

    const response = await request(app).get(
      '/api/posts/post-1/images?candidateImageIds=wolf-1'
    );

    expect(response.status).toBe(200);
    expect(matchingService.matchImagesForPost).toHaveBeenCalledWith('post-1', {
      candidateImageIds: ['wolf-1']
    });
  });
});
