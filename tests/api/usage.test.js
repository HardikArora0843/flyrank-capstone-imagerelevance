const request = require('supertest');

jest.mock('../../src/services/costTrackingService', () => ({
  listAIUsage: jest.fn(),
  summarizeAIUsage: jest.fn()
}));

const app = require('../../src/app');
const costTrackingService = require('../../src/services/costTrackingService');

describe('/api/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists usage records with filters', async () => {
    costTrackingService.listAIUsage.mockResolvedValue([
      {
        operation: 'vision',
        totalTokens: 52
      }
    ]);

    const response = await request(app).get('/api/usage?operation=vision');

    expect(response.status).toBe(200);
    expect(response.body.usage).toHaveLength(1);
    expect(costTrackingService.listAIUsage).toHaveBeenCalledWith({
      operation: 'vision'
    });
  });

  it('returns usage summaries', async () => {
    costTrackingService.summarizeAIUsage.mockResolvedValue({
      records: 2,
      totalTokens: 100,
      estimatedCost: 0.01
    });

    const response = await request(app).get('/api/usage/summary?operation=vision');

    expect(response.status).toBe(200);
    expect(response.body.summary.records).toBe(2);
  });

  it('rejects unknown usage operations', async () => {
    const response = await request(app).get('/api/usage?operation=unknown');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request payload');
  });
});
