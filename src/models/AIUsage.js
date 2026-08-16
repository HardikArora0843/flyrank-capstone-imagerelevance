const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    operation: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image'
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    inputTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    outputTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    totalTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

module.exports =
  mongoose.models.AIUsage || mongoose.model('AIUsage', aiUsageSchema);
