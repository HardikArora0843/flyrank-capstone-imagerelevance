const IMAGE_PROCESSING_STATUSES = Object.freeze([
  'pending',
  'processing',
  'completed',
  'flagged',
  'failed'
]);

const SUGGESTION_DECISIONS = Object.freeze([
  'recommended',
  'rejected',
  'no_confident_match',
  'approved',
  'manually_rejected'
]);

const GUARD_STATUSES = Object.freeze([
  'accepted',
  'rejected',
  'flagged'
]);

const JOB_STATUSES = Object.freeze([
  'pending',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
]);

const JOB_TYPES = Object.freeze({
  PROCESS_IMAGE: 'process_image',
  PROCESS_IMAGE_BATCH: 'process_image_batch'
});

const REVIEW_DECISIONS = Object.freeze([
  'approved',
  'rejected'
]);

module.exports = {
  IMAGE_PROCESSING_STATUSES,
  SUGGESTION_DECISIONS,
  GUARD_STATUSES,
  JOB_TYPES,
  JOB_STATUSES,
  REVIEW_DECISIONS
};
