const mongoose = require('mongoose');

const { IMAGE_PROCESSING_STATUSES } = require('../utils/constants');

const imageSchema = new mongoose.Schema(
  {
    cloudinaryUrl: {
      type: String,
      required: true,
      trim: true
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      index: true
    },
    category: {
      type: String,
      trim: true,
      index: true
    },
    attributes: {
      type: [String],
      default: []
    },
    caption: {
      type: String,
      trim: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    processingStatus: {
      type: String,
      enum: IMAGE_PROCESSING_STATUSES,
      default: 'pending',
      index: true
    },
    processingAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    processingError: {
      type: String
    },
    embedding: {
      type: [Number],
      default: []
    },
    embeddingModel: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Image || mongoose.model('Image', imageSchema);
