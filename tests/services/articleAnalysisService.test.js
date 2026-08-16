const articleAnalysisService = require('../../src/services/articleAnalysisService');

function geminiResponse(text) {
  return {
    usageMetadata: {
      promptTokenCount: 50,
      candidatesTokenCount: 10,
      totalTokenCount: 60
    },
    candidates: [
      {
        content: {
          parts: [{ text }]
        }
      }
    ]
  };
}

describe('articleAnalysisService', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('parses strict article JSON', () => {
    const metadata = articleAnalysisService.parseArticleJson(
      JSON.stringify({
        subject: 'red fox',
        category: 'animal',
        keywords: ['fox', 'wildlife']
      })
    );

    expect(metadata.category).toBe('animal');
  });

  it('retries malformed output and accepts a later valid response', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => geminiResponse('not json')
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () =>
          geminiResponse(
            JSON.stringify({
              subject: 'red fox',
              category: 'animal',
              keywords: ['fox', 'behavior', 'habitat']
            })
          )
      });

    const result = await articleAnalysisService.analyzeArticle(
      {
        title: 'The Behavior of Red Foxes',
        content: 'Red foxes are adaptable canids with rich hunting behavior.'
      },
      {
        fetchImpl,
        maxAttempts: 2
      }
    );

    expect(result.metadata.subject).toBe('red fox');
    expect(result.attempts).toBe(2);
  });

  it('fails after retry exhaustion', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => geminiResponse('not json')
    });

    await expect(
      articleAnalysisService.analyzeArticle(
        {
          title: 'Bad',
          content: 'Bad'
        },
        {
          fetchImpl,
          maxAttempts: 1
        }
      )
    ).rejects.toMatchObject({
      message: 'Article analysis failed after retry exhaustion',
      statusCode: 502
    });
  });
});
