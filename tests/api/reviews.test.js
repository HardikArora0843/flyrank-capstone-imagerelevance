const request = require('supertest');

jest.mock('../../src/services/reviewService', () => ({
  approveSuggestion: jest.fn(),
  createReview: jest.fn(),
  getSuggestionById: jest.fn(),
  listReviewsForSuggestion: jest.fn(),
  rejectSuggestion: jest.fn()
}));

const app = require('../../src/app');
const reviewService = require('../../src/services/reviewService');

describe('/api/suggestions review routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets a suggestion for review', async () => {
    reviewService.getSuggestionById.mockResolvedValue({
      _id: 'suggestion-1',
      decision: 'recommended'
    });

    const response = await request(app).get('/api/suggestions/suggestion-1');

    expect(response.status).toBe(200);
    expect(response.body.suggestion.decision).toBe('recommended');
  });

  it('creates a generic review record', async () => {
    reviewService.createReview.mockResolvedValue({
      suggestion: { decision: 'approved' },
      review: { decision: 'approved' }
    });

    const response = await request(app)
      .post('/api/suggestions/suggestion-1/reviews')
      .send({
        decision: 'approved',
        reason: 'Correct fox image',
        reviewer: 'Hardik'
      });

    expect(response.status).toBe(201);
    expect(response.body.suggestion.decision).toBe('approved');
    expect(reviewService.createReview).toHaveBeenCalledWith('suggestion-1', {
      decision: 'approved',
      reason: 'Correct fox image',
      reviewer: 'Hardik'
    });
  });

  it('approves a suggestion', async () => {
    reviewService.approveSuggestion.mockResolvedValue({
      suggestion: { decision: 'approved' },
      review: { decision: 'approved' }
    });

    const response = await request(app)
      .post('/api/suggestions/suggestion-1/approve')
      .send({ reason: 'Good match' });

    expect(response.status).toBe(201);
    expect(reviewService.approveSuggestion).toHaveBeenCalledWith('suggestion-1', {
      reason: 'Good match'
    });
  });

  it('rejects a suggestion', async () => {
    reviewService.rejectSuggestion.mockResolvedValue({
      suggestion: { decision: 'manually_rejected' },
      review: { decision: 'rejected' }
    });

    const response = await request(app)
      .post('/api/suggestions/suggestion-1/reject')
      .send({ reason: 'Wrong animal' });

    expect(response.status).toBe(201);
    expect(response.body.suggestion.decision).toBe('manually_rejected');
  });

  it('lists review history', async () => {
    reviewService.listReviewsForSuggestion.mockResolvedValue([
      { decision: 'approved' }
    ]);

    const response = await request(app).get('/api/suggestions/suggestion-1/reviews');

    expect(response.status).toBe(200);
    expect(response.body.reviews).toHaveLength(1);
  });

  it('rejects invalid review payloads', async () => {
    const response = await request(app)
      .post('/api/suggestions/suggestion-1/reviews')
      .send({ decision: 'approved', reason: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request payload');
  });
});
