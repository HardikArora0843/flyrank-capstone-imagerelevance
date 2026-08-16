const express = require('express');

const reviewController = require('../controllers/reviewController');
const validate = require('../middleware/validation');
const { createReviewSchema } = require('../schemas/apiSchemas');

const router = express.Router();

router.get('/:id', reviewController.getSuggestion);
router.get('/:id/reviews', reviewController.listReviews);
router.post('/:id/reviews', validate(createReviewSchema), reviewController.createReview);
router.post(
  '/:id/approve',
  validate(createReviewSchema.omit({ decision: true })),
  reviewController.approveSuggestion
);
router.post(
  '/:id/reject',
  validate(createReviewSchema.omit({ decision: true })),
  reviewController.rejectSuggestion
);

module.exports = router;
