describe('visionService usage tracking', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  function imageResponse() {
    return {
      ok: true,
      headers: {
        get: jest.fn(() => 'image/jpeg')
      },
      arrayBuffer: async () => Buffer.from('fake-image-data')
    };
  }

  it('records AI usage for successful Gemini responses before parsing metadata', async () => {
    const recordAIUsage = jest.fn().mockResolvedValue({});

    jest.doMock('../../src/services/costTrackingService', () => ({
      recordAIUsage,
      usageFromGeminiResponse: jest.fn(() => ({
        inputTokens: 40,
        outputTokens: 12,
        totalTokens: 52
      }))
    }));

    const visionService = require('../../src/services/visionService');

    const fetchImpl = jest.fn();

    // First request: download image from Cloudinary.
    fetchImpl.mockResolvedValueOnce(imageResponse());

    // Second request: Gemini Vision.
    fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        usageMetadata: {
          promptTokenCount: 40,
          candidatesTokenCount: 12,
          totalTokenCount: 52
        },
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    subject: 'red fox',
                    category: 'animal',
                    attributes: ['orange fur'],
                    caption: 'A red fox',
                    confidence: 0.9
                  })
                }
              ]
            }
          }
        ]
      })
    });

    await visionService.analyzeImage(
      {
        imageUrl: 'https://example.com/fox.jpg',
        mimeType: 'image/jpeg'
      },
      {
        fetchImpl,
        imageId: '507f1f77bcf86cd799439011',
        maxAttempts: 1
      }
    );

    expect(recordAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        model: 'gemini-3.6-flash',
        operation: 'vision',
        imageId: '507f1f77bcf86cd799439011',
        usage: {
          inputTokens: 40,
          outputTokens: 12,
          totalTokens: 52
        }
      })
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('records a zero-token attempt when Gemini returns an HTTP error', async () => {
    const recordAIUsage = jest.fn().mockResolvedValue({});

    jest.doMock('../../src/services/costTrackingService', () => ({
      recordAIUsage,
      usageFromGeminiResponse: jest.fn()
    }));

    const visionService = require('../../src/services/visionService');

    const fetchImpl = jest.fn();

    // First request: image download succeeds.
    fetchImpl.mockResolvedValueOnce(imageResponse());

    // Second request: Gemini returns HTTP error.
    fetchImpl.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'service unavailable'
    });

    await expect(
      visionService.analyzeImage(
        {
          imageUrl: 'https://example.com/fox.jpg',
          mimeType: 'image/jpeg'
        },
        {
          fetchImpl,
          imageId: '507f1f77bcf86cd799439011',
          maxAttempts: 1
        }
      )
    ).rejects.toMatchObject({
      message: 'Vision analysis failed after retry exhaustion'
    });

    expect(recordAIUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'vision',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        }
      })
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});