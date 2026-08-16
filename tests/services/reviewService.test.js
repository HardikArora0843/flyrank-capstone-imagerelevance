jest.mock('../../src/models/Review', () => ({
  create: jest.fn(),
  find: jest.fn()
}));

jest.mock('../../src/models/Suggestion', () => ({
  findById: jest.fn()
}));

const Review = require('../../src/models/Review');
const Suggestion = require('../../src/models/Suggestion');
const reviewService = require('../../src/services/reviewService');

const VALID_SUGGESTION_ID = '507f1f77bcf86cd799439011';

function suggestion(overrides = {}) {
  return {
    _id: VALID_SUGGESTION_ID,
    decision: 'recommended',
    decisionReason: 'Strong match',
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps approval to approved suggestion state', async () => {
    const suggestionDoc = suggestion();

    Suggestion.findById.mockResolvedValue(suggestionDoc);

    Review.create.mockResolvedValue({
      suggestionId: VALID_SUGGESTION_ID,
      decision: 'approved',
      reason: 'Looks correct'
    });

    const result = await reviewService.approveSuggestion(
      VALID_SUGGESTION_ID,
      {
        reason: 'Looks correct',
        reviewer: 'Hardik'
      }
    );

    expect(result.suggestion.decision).toBe('approved');
    expect(result.suggestion.decisionReason).toBe('Looks correct');
    expect(suggestionDoc.save).toHaveBeenCalledTimes(1);

    expect(Review.create).toHaveBeenCalledWith({
      suggestionId: VALID_SUGGESTION_ID,
      decision: 'approved',
      reason: 'Looks correct',
      reviewer: 'Hardik'
    });
  });

  it('maps rejection to manually_rejected suggestion state', async () => {
    const suggestionDoc = suggestion();

    Suggestion.findById.mockResolvedValue(suggestionDoc);

    Review.create.mockResolvedValue({
      suggestionId: VALID_SUGGESTION_ID,
      decision: 'rejected',
      reason: 'Wrong species'
    });

    const result = await reviewService.rejectSuggestion(
      VALID_SUGGESTION_ID,
      {
        reason: 'Wrong species'
      }
    );

    expect(result.suggestion.decision).toBe('manually_rejected');
    expect(result.suggestion.decisionReason).toBe('Wrong species');

    expect(Review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewer: 'human-reviewer'
      })
    );
  });

  it('lists review history for a suggestion', async () => {
    Suggestion.findById.mockResolvedValue(suggestion());

    const sort = jest.fn().mockResolvedValue([
      {
        decision: 'approved'
      }
    ]);

    Review.find.mockReturnValue({
      sort
    });

    const reviews =
      await reviewService.listReviewsForSuggestion(
        VALID_SUGGESTION_ID
      );

    expect(reviews).toHaveLength(1);

    expect(Review.find).toHaveBeenCalledWith({
      suggestionId: VALID_SUGGESTION_ID
    });

    expect(sort).toHaveBeenCalledWith({
      createdAt: -1
    });
  });

  it('throws NotFoundError for missing suggestions', async () => {
    Suggestion.findById.mockResolvedValue(null);

    await expect(
      reviewService.approveSuggestion(
        VALID_SUGGESTION_ID,
        {
          reason: 'ok'
        }
      )
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404
    });
  });

  it('throws NotFoundError for an invalid suggestion id', async () => {
    await expect(
      reviewService.getSuggestionById('not-a-valid-id')
    ).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404
    });

    expect(Suggestion.findById).not.toHaveBeenCalled();
  });
});