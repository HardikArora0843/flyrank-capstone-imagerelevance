const mongoose = require('mongoose');
const Review = require('../models/Review');
const Suggestion = require('../models/Suggestion');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

async function getSuggestionById(suggestionId) {
  if (!mongoose.isValidObjectId(suggestionId)) {
    throw new NotFoundError('Suggestion not found');
  }

  const suggestion = await Suggestion.findById(suggestionId);

  if (!suggestion) {
    throw new NotFoundError('Suggestion not found');
  }

  return suggestion;
}

function mapReviewDecisionToSuggestionDecision(decision) {
  if (decision === 'approved') {
    return 'approved';
  }

  if (decision === 'rejected') {
    return 'manually_rejected';
  }

  throw new ValidationError('Unsupported review decision');
}

async function createReview(suggestionId, data) {
  const suggestion = await getSuggestionById(suggestionId);
  const suggestionDecision = mapReviewDecisionToSuggestionDecision(data.decision);

  const review = await Review.create({
    suggestionId,
    decision: data.decision,
    reason: data.reason,
    reviewer: data.reviewer || 'human-reviewer'
  });

  suggestion.decision = suggestionDecision;
  suggestion.decisionReason = data.reason;
  await suggestion.save();

  logger.info('suggestion_reviewed', {
    suggestionId,
    decision: data.decision,
    reviewer: data.reviewer || 'human-reviewer'
  });

  return {
    suggestion,
    review
  };
}

async function approveSuggestion(suggestionId, data) {
  return createReview(suggestionId, {
    ...data,
    decision: 'approved'
  });
}

async function rejectSuggestion(suggestionId, data) {
  return createReview(suggestionId, {
    ...data,
    decision: 'rejected'
  });
}

async function listReviewsForSuggestion(suggestionId) {
  await getSuggestionById(suggestionId);
  return Review.find({ suggestionId }).sort({ createdAt: -1 });
}

module.exports = {
  approveSuggestion,
  createReview,
  getSuggestionById,
  listReviewsForSuggestion,
  mapReviewDecisionToSuggestionDecision,
  rejectSuggestion
};