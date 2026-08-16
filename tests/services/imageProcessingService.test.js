jest.mock('../../src/models/Image', () => ({
  findById: jest.fn()
}));

jest.mock('../../src/services/visionService', () => ({
  analyzeImage: jest.fn()
}));

jest.mock('../../src/services/embeddingService', () => ({
  generateImageEmbedding: jest.fn()
}));

const Image = require('../../src/models/Image');
const visionService = require('../../src/services/visionService');
const embeddingService = require('../../src/services/embeddingService');
const { processImageVision } = require('../../src/services/imageProcessingService');

function imageDocument(overrides = {}) {
  return {
    id: 'image-1',
    cloudinaryUrl: 'https://example.com/fox.jpg',
    processingStatus: 'pending',
    processingAttempts: 0,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('imageProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores validated metadata and marks completed images', async () => {
    const image = imageDocument();
    Image.findById.mockResolvedValue(image);
    visionService.analyzeImage.mockResolvedValue({
      metadata: {
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur'],
        caption: 'A red fox',
        confidence: 0.92
      },
      status: 'completed',
      reason: 'Vision metadata validated'
    });
    embeddingService.generateImageEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      model: 'text-embedding-004'
    });

    const result = await processImageVision('image-1');

    expect(result.image.subject).toBe('red fox');
    expect(result.image.processingStatus).toBe('completed');
    expect(result.image.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.image.embeddingModel).toBe('text-embedding-004');
    expect(image.save).toHaveBeenCalledTimes(2);
  });

  it('preserves low-confidence result as flagged rather than completed', async () => {
    const image = imageDocument();
    Image.findById.mockResolvedValue(image);
    visionService.analyzeImage.mockResolvedValue({
      metadata: {
        subject: 'unknown animal',
        category: 'animal',
        attributes: ['blurry'],
        caption: 'A blurry animal',
        confidence: 0.42
      },
      status: 'flagged',
      reason: 'Vision confidence 0.42 is below threshold 0.7'
    });

    const result = await processImageVision('image-1');

    expect(result.image.processingStatus).toBe('flagged');
    expect(result.image.processingError).toContain('below threshold');
    expect(embeddingService.generateImageEmbedding).not.toHaveBeenCalled();
  });

  it('skips already completed images for idempotency', async () => {
    const image = imageDocument({ processingStatus: 'completed' });
    Image.findById.mockResolvedValue(image);

    const result = await processImageVision('image-1');

    expect(result.skipped).toBe(true);
    expect(visionService.analyzeImage).not.toHaveBeenCalled();
    expect(image.save).not.toHaveBeenCalled();
  });

  it('marks images failed when vision analysis fails', async () => {
    const image = imageDocument();
    Image.findById.mockResolvedValue(image);
    visionService.analyzeImage.mockRejectedValue(new Error('bad model output'));

    await expect(processImageVision('image-1')).rejects.toThrow('bad model output');

    expect(image.processingStatus).toBe('failed');
    expect(image.processingError).toBe('bad model output');
    expect(image.save).toHaveBeenCalledTimes(2);
  });
});
