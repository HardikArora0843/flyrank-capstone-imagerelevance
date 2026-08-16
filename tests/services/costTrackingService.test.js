jest.mock('../../src/models/AIUsage', () => ({
  create: jest.fn(),
  find: jest.fn()
}));

const AIUsage = require('../../src/models/AIUsage');
const costTrackingService = require('../../src/services/costTrackingService');

describe('costTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts Gemini usage metadata', () => {
    const usage = costTrackingService.usageFromGeminiResponse({
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 30,
        totalTokenCount: 150
      }
    });

    expect(usage).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      totalTokens: 150
    });
  });

  it('records AI usage with normalized token totals', async () => {
    AIUsage.create.mockResolvedValue({
      operation: 'vision',
      totalTokens: 12
    });

    const record = await costTrackingService.recordAIUsage({
      model: 'gemini-1.5-flash',
      operation: 'vision',
      imageId: '507f1f77bcf86cd799439011',
      usage: {
        inputTokens: 10,
        outputTokens: 2
      }
    });

    expect(record.totalTokens).toBe(12);
    expect(AIUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        model: 'gemini-1.5-flash',
        operation: 'vision',
        imageId: '507f1f77bcf86cd799439011',
        inputTokens: 10,
        outputTokens: 2,
        totalTokens: 12
      })
    );
  });

  it('summarizes usage records', async () => {
    AIUsage.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          estimatedCost: 0.01
        },
        {
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
          estimatedCost: 0.02
        }
      ])
    });

    const summary = await costTrackingService.summarizeAIUsage({
      operation: 'vision'
    });

    expect(summary).toEqual({
      records: 2,
      inputTokens: 30,
      outputTokens: 15,
      totalTokens: 45,
      estimatedCost: 0.03
    });
  });
});
