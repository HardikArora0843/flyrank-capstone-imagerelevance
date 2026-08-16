const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
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
    keywords: {
      type: [String],
      default: []
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

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
