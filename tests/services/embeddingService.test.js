describe('embeddingService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('builds image embedding text from caption, subject, category, and attributes', () => {
    const embeddingService = require('../../src/services/embeddingService');

    const text = embeddingService.buildImageEmbeddingText({
      caption: 'A red fox in a forest',
      subject: 'red fox',
      category: 'animal',
      attributes: ['orange fur', 'forest']
    });

    expect(text).toContain('A red fox in a forest');
    expect(text).toContain('Subject: red fox.');
    expect(text).toContain('Attributes: orange fur, forest.');
  });

  it('builds post embedding text from content and structured metadata', () => {
    const embeddingService = require('../../src/services/embeddingService');

    const text = embeddingService.buildPostEmbeddingText({
      title: 'The Behavior of Red Foxes',
      content: 'Red foxes adapt to many habitats.',
      subject: 'red fox',
      category: 'animal',
      keywords: ['fox', 'habitat']
    });

    expect(text).toContain('The Behavior of Red Foxes');
    expect(text).toContain('Subject: red fox.');
    expect(text).toContain('Keywords: fox, habitat.');
  });

  it('generates embeddings and records usage', async () => {
    const recordAIUsage = jest.fn().mockResolvedValue({});

    jest.doMock('../../src/services/costTrackingService', () => ({
      recordAIUsage,
      usageFromGeminiEmbeddingResponse: jest.fn(() => ({
        inputTokens: 8,
        outputTokens: 0,
        totalTokens: 8
      }))
    }));

    const embeddingService = require('../../src/services/embeddingService');
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: {
          values: [0.1, 0.2, 0.3]
        },
        usageMetadata: {
          promptTokenCount: 8,
          totalTokenCount: 8
        }
      })
    });

    const result = await embeddingService.generateEmbedding('red fox text', {
      fetchImpl,
      imageId: '507f1f77bcf86cd799439011'
    });

    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.model).toBe('gemini-embedding-2');
    expect(recordAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'embedding',
        imageId: '507f1f77bcf86cd799439011'
      })
    );
  });

  it('rejects malformed embedding responses', async () => {
    const embeddingService = require('../../src/services/embeddingService');
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: [] } })
    });

    await expect(
      embeddingService.generateEmbedding('red fox text', { fetchImpl })
    ).rejects.toMatchObject({
      message: 'Gemini embedding response did not include values'
    });
  });
});
