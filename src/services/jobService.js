const Job = require('../models/Job');
const Image = require('../models/Image');
const { inngest } = require('../config/inngest');
const { JOB_TYPES } = require('../utils/constants');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

function jobIdForImage(imageId) {
  return `${JOB_TYPES.PROCESS_IMAGE}:${imageId}`;
}

async function createImageProcessingJob(imageId) {
  const jobId = jobIdForImage(imageId);

  const job = await Job.findOneAndUpdate(
    { jobId },
    {
      $setOnInsert: {
        jobId,
        type: JOB_TYPES.PROCESS_IMAGE,
        status: 'pending',
        total: 1,
        processed: 0,
        failed: 0,
        flagged: 0,
        attempts: 0
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  await inngest.send({
    name: 'image/process.requested',
    data: {
      imageId: imageId.toString(),
      jobId
    }
  });

  logger.info('image_processing_event_sent', { imageId: imageId.toString(), jobId });

  return job;
}

async function createBatchProcessingJob(imageIds) {
  const jobId = `${JOB_TYPES.PROCESS_IMAGE_BATCH}:${Date.now()}`;
  const job = await Job.create({
    jobId,
    type: JOB_TYPES.PROCESS_IMAGE_BATCH,
    status: 'pending',
    total: imageIds.length
  });

  await inngest.send({
    name: 'image/batch.process.requested',
    data: {
      imageIds: imageIds.map((id) => id.toString()),
      jobId
    }
  });

  logger.info('image_batch_processing_event_sent', {
    jobId,
    total: imageIds.length
  });

  return job;
}

async function createPendingBatchJob() {
  const images = await Image.find({ processingStatus: 'pending' }).select('_id');
  return createBatchProcessingJob(images.map((image) => image._id));
}

async function markJobStarted(jobId) {
  return Job.findOneAndUpdate(
    { jobId },
    {
      $set: {
        status: 'processing',
        startedAt: new Date(),
        error: undefined
      },
      $inc: {
        attempts: 1
      }
    },
    {
      new: true
    }
  );
}

async function markJobImageResult(jobId, result) {
  const increment = {
    processed: result.image?.processingStatus === 'completed' ? 1 : 0,
    flagged: result.image?.processingStatus === 'flagged' ? 1 : 0
  };

  const job = await Job.findOneAndUpdate(
    { jobId },
    {
      $inc: increment
    },
    {
      new: true
    }
  );

  return job;
}

async function markJobFailed(jobId, error) {
  return Job.findOneAndUpdate(
    { jobId },
    {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      },
      $inc: {
        failed: 1
      }
    },
    {
      new: true
    }
  );
}

async function markJobCompleted(jobId) {
  const job = await Job.findOne({ jobId });
  if (!job) {
    return null;
  }

  const finished = job.processed + job.flagged + job.failed >= job.total;
  if (!finished) {
    return job;
  }

  job.status = job.failed > 0 ? 'completed_with_errors' : 'completed';
  job.completedAt = new Date();
  await job.save();

  return job;
}

async function getJobById(jobId) {
  const job = await Job.findOne({ jobId });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
}

async function listJobs(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  return Job.find(query).sort({ createdAt: -1 });
}

module.exports = {
  createImageProcessingJob,
  createBatchProcessingJob,
  createPendingBatchJob,
  getJobById,
  jobIdForImage,
  listJobs,
  markJobCompleted,
  markJobFailed,
  markJobImageResult,
  markJobStarted
};
