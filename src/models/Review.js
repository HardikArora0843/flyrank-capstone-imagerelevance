const mongoose = require('mongoose');

const { REVIEW_DECISIONS } = require('../utils/constants');

const reviewSchema = new mongoose.Schema(
  {
    suggestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Suggestion',
      required: true,
      index: true
    },
    decision: {
      type: String,
      enum: REVIEW_DECISIONS,
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    reviewer: {
      type: String,
      default: 'human-reviewer',
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);
