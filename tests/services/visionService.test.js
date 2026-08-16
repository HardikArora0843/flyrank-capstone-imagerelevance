const visionService = require('../../src/services/visionService');

function geminiResponse(text) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }]
        }
      }
    ]
  };
}

function imageResponse() {
  return {
    ok: true,
    headers: {
      get: jest.fn(() => 'image/jpeg')
    },
    arrayBuffer: async () => Buffer.from('fake-image-data')
  };
}

function geminiOkResponse(text) {
  return {
    ok: true,
    json: async () => geminiResponse(text)
  };
}

function createFetchMock(...geminiResponses) {
  const fetchImpl = jest.fn();

  for (const response of geminiResponses) {
    fetchImpl
      .mockResolvedValueOnce(imageResponse())
      .mockResolvedValueOnce(geminiOkResponse(response));
  }

  return fetchImpl;
}

describe('visionService', () => {
  it('parses strict JSON vision metadata', () => {
    const metadata = visionService.parseVisionJson(
      JSON.stringify({
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur', 'white tail tip'],
        caption: 'A red fox standing in grass',
        confidence: 0.93
      })
    );

    expect(metadata.subject).toBe('red fox');
  });

  it('strips JSON markdown fences before validation', () => {
    const metadata = visionService.parseVisionJson(`\`\`\`json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": ["orange fur"],
  "caption": "A red fox",
  "confidence": 0.91
}
\`\`\``);

    expect(metadata.category).toBe('animal');
  });

  it('retries malformed Gemini output and accepts a later valid response', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchImpl = createFetchMock(
      'not json',
      JSON.stringify({
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur'],
        caption: 'A red fox',
        confidence: 0.9
      })
    );

    const result = await visionService.analyzeImage(
      {
        imageUrl: 'https://example.com/fox.jpg',
        mimeType: 'image/jpeg'
      },
      {
        fetchImpl,
        maxAttempts: 2
      }
    );

    expect(result.status).toBe('completed');
    expect(result.attempts).toBe(2);

    // Two fetches per attempt:
    // 1. Download image
    // 2. Gemini request
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('flags low-confidence validated output', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchImpl = createFetchMock(
      JSON.stringify({
        subject: 'unknown animal',
        category: 'animal',
        attributes: ['blurry', 'distant'],
        caption: 'A blurry animal in the distance',
        confidence: 0.4
      })
    );

    const result = await visionService.analyzeImage(
      {
        imageUrl: 'https://example.com/animal.jpg',
        mimeType: 'image/jpeg'
      },
      {
        fetchImpl,
        maxAttempts: 1
      }
    );

    expect(result.status).toBe('flagged');
    expect(result.reason).toContain('below threshold');

    // One image download + one Gemini request.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails after retry exhaustion', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchImpl = jest.fn();

    // Attempt 1:
    fetchImpl.mockResolvedValueOnce(imageResponse());
    fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => geminiResponse('not json')
    });

    // Attempt 2:
    fetchImpl.mockResolvedValueOnce(imageResponse());
    fetchImpl.mockResolvedValueOnce({
      ok: true,
      json: async () => geminiResponse('not json')
    });

    await expect(
      visionService.analyzeImage(
        {
          imageUrl: 'https://example.com/bad.jpg',
          mimeType: 'image/jpeg'
        },
        {
          fetchImpl,
          maxAttempts: 2
        }
      )
    ).rejects.toMatchObject({
      message: 'Vision analysis failed after retry exhaustion',
      statusCode: 502
    });

    // Two fetches per attempt × two attempts.
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
});