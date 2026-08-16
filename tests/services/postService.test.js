jest.mock('../../src/models/Post', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../../src/services/articleAnalysisService', () => ({
  analyzeArticle: jest.fn()
}));

jest.mock('../../src/services/embeddingService', () => ({
  generatePostEmbedding: jest.fn()
}));

const Post = require('../../src/models/Post');
const articleAnalysisService = require('../../src/services/articleAnalysisService');
const embeddingService = require('../../src/services/embeddingService');
const postService = require('../../src/services/postService');

describe('postService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a post with analyzed metadata', async () => {
    articleAnalysisService.analyzeArticle.mockResolvedValue({
      metadata: {
        subject: 'red fox',
        category: 'animal',
        keywords: ['fox', 'wildlife']
      }
    });
    const createdPost = {
      title: 'The Behavior of Red Foxes',
      subject: 'red fox',
      save: jest.fn().mockResolvedValue(undefined)
    };
    Post.create.mockResolvedValue(createdPost);
    embeddingService.generatePostEmbedding.mockResolvedValue({
      embedding: [0.4, 0.5, 0.6],
      model: 'text-embedding-004'
    });

    const post = await postService.createPost({
      title: 'The Behavior of Red Foxes',
      content: 'Red foxes hunt and adapt to different habitats.'
    });

    expect(post.subject).toBe('red fox');
    expect(post.embedding).toEqual([0.4, 0.5, 0.6]);
    expect(post.embeddingModel).toBe('text-embedding-004');
    expect(createdPost.save).toHaveBeenCalledTimes(1);
    expect(Post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'red fox',
        category: 'animal',
        keywords: ['fox', 'wildlife']
      })
    );
  });

  it('updates a post and refreshes analysis metadata', async () => {
    const post = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Old title',
      content: 'Old content',
      save: jest.fn().mockResolvedValue(undefined)
    };
    Post.findById.mockResolvedValue(post);
    articleAnalysisService.analyzeArticle.mockResolvedValue({
      metadata: {
        subject: 'red fox',
        category: 'animal',
        keywords: ['fox']
      }
    });
    embeddingService.generatePostEmbedding.mockResolvedValue({
      embedding: [0.7, 0.8],
      model: 'text-embedding-004'
    });

    const result = await postService.updatePost(post._id, {
      title: 'The Behavior of Red Foxes'
    });

    expect(result.title).toBe('The Behavior of Red Foxes');
    expect(result.subject).toBe('red fox');
    expect(result.embedding).toEqual([0.7, 0.8]);
    expect(post.save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError for missing posts', async () => {
    Post.findById.mockResolvedValue(null);

    await expect(postService.getPostById('missing')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404
    });
  });
});
