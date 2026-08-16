const mongoose = require('mongoose');

const { JOB_STATUSES } = require('../utils/constants');

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'pending',
      index: true
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    processed: {
      type: Number,
      default: 0,
      min: 0
    },
    failed: {
      type: Number,
      default: 0,
      min: 0
    },
    flagged: {
      type: Number,
      default: 0,
      min: 0
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Job || mongoose.model('Job', jobSchema);
