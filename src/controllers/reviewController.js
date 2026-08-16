const reviewService = require('../services/reviewService');

async function getSuggestion(req, res, next) {
  try {
    const suggestion = await reviewService.getSuggestionById(req.params.id);
    res.status(200).json({ suggestion });
  } catch (error) {
    next(error);
  }
}

async function listReviews(req, res, next) {
  try {
    const reviews = await reviewService.listReviewsForSuggestion(req.params.id);
    res.status(200).json({ reviews });
  } catch (error) {
    next(error);
  }
}

async function createReview(req, res, next) {
  try {
    const result = await reviewService.createReview(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function approveSuggestion(req, res, next) {
  try {
    const result = await reviewService.approveSuggestion(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function rejectSuggestion(req, res, next) {
  try {
    const result = await reviewService.rejectSuggestion(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveSuggestion,
  createReview,
  getSuggestion,
  listReviews,
  rejectSuggestion
};
