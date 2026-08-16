const request = require('supertest');

jest.mock('../../src/services/imageService', () => ({
  createImageFromUpload: jest.fn(),
  listImages: jest.fn(),
  getImageById: jest.fn(),
  deleteImageById: jest.fn()
}));

const app = require('../../src/app');
const imageService = require('../../src/services/imageService');

describe('/api/images', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploads an image and creates a pending image record', async () => {
    const image = {
      _id: '507f1f77bcf86cd799439011',
      cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/fox.jpg',
      cloudinaryPublicId: 'flyrank-capstone-image-relevance/fox',
      originalFilename: 'fox.png',
      processingStatus: 'pending'
    };
    imageService.createImageFromUpload.mockResolvedValue(image);

    const response = await request(app)
      .post('/api/images')
      .attach('image', Buffer.from('fake image bytes'), {
        filename: 'fox.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(201);
    expect(response.body.image).toEqual(image);
    expect(imageService.createImageFromUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'fox.png',
        mimetype: 'image/png'
      })
    );
  });

  it('rejects upload requests without an image file', async () => {
    const response = await request(app).post('/api/images').field('name', 'fox');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Image file is required');
    expect(imageService.createImageFromUpload).not.toHaveBeenCalled();
  });

  it('rejects non-image uploads', async () => {
    const response = await request(app)
      .post('/api/images')
      .attach('image', Buffer.from('not an image'), {
        filename: 'notes.txt',
        contentType: 'text/plain'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Only image uploads are supported');
  });

  it('lists images with optional status filter', async () => {
    imageService.listImages.mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        processingStatus: 'pending'
      }
    ]);

    const response = await request(app).get('/api/images?processingStatus=pending');

    expect(response.status).toBe(200);
    expect(response.body.images).toHaveLength(1);
    expect(imageService.listImages).toHaveBeenCalledWith({
      processingStatus: 'pending'
    });
  });

  it('rejects invalid status filters', async () => {
    const response = await request(app).get('/api/images?processingStatus=unknown');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request payload');
  });

  it('returns a single image by id', async () => {
    const image = {
      _id: '507f1f77bcf86cd799439011',
      processingStatus: 'completed'
    };
    imageService.getImageById.mockResolvedValue(image);

    const response = await request(app).get('/api/images/507f1f77bcf86cd799439011');

    expect(response.status).toBe(200);
    expect(response.body.image).toEqual(image);
  });

  it('returns 404 when image is missing', async () => {
    imageService.getImageById.mockResolvedValue(null);

    const response = await request(app).get('/api/images/507f1f77bcf86cd799439011');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Image not found');
  });
});
