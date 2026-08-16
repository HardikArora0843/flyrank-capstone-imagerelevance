const request = require('supertest');

jest.mock('../../src/services/postService', () => ({
  createPost: jest.fn(),
  deletePost: jest.fn(),
  getPostById: jest.fn(),
  listPosts: jest.fn(),
  updatePost: jest.fn()
}));

const app = require('../../src/app');
const postService = require('../../src/services/postService');

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a post', async () => {
    const post = {
      _id: '507f1f77bcf86cd799439011',
      title: 'The Behavior of Red Foxes',
      subject: 'red fox',
      category: 'animal',
      keywords: ['fox', 'wildlife']
    };
    postService.createPost.mockResolvedValue(post);

    const response = await request(app).post('/api/posts').send({
      title: 'The Behavior of Red Foxes',
      content: 'Red foxes are intelligent and adaptable animals.'
    });

    expect(response.status).toBe(201);
    expect(response.body.post).toEqual(post);
    expect(postService.createPost).toHaveBeenCalledWith({
      title: 'The Behavior of Red Foxes',
      content: 'Red foxes are intelligent and adaptable animals.'
    });
  });

  it('rejects invalid post payloads', async () => {
    const response = await request(app).post('/api/posts').send({
      title: '',
      content: ''
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request payload');
  });

  it('lists posts', async () => {
    postService.listPosts.mockResolvedValue([{ title: 'A post' }]);

    const response = await request(app).get('/api/posts');

    expect(response.status).toBe(200);
    expect(response.body.posts).toHaveLength(1);
  });

  it('returns a post by id', async () => {
    postService.getPostById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      title: 'A post'
    });

    const response = await request(app).get('/api/posts/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.post.title).toBe('A post');
  });

  it('updates a post', async () => {
    postService.updatePost.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      title: 'Updated'
    });

    const response = await request(app)
      .patch('/api/posts/507f1f77bcf86cd799439011')
      .send({ title: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.post.title).toBe('Updated');
  });
});
