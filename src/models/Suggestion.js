const mongoose = require('mongoose');

const { GUARD_STATUSES, SUGGESTION_DECISIONS } = require('../utils/constants');

const suggestionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      index: true
    },
    similarityScore: {
      type: Number,
      min: -1,
      max: 1
    },
    guardStatus: {
      type: String,
      enum: GUARD_STATUSES,
      index: true
    },
    guardReasons: {
      type: [String],
      default: []
    },
    decision: {
      type: String,
      enum: SUGGESTION_DECISIONS,
      required: true
    },
    decisionReason: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports =
  mongoose.models.Suggestion || mongoose.model('Suggestion', suggestionSchema);
