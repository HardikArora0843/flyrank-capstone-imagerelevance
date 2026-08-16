const { inngest } = require('../config/inngest');
const imageProcessingService = require('../services/imageProcessingService');
const jobService = require('../services/jobService');

const processImageBatch = inngest.createFunction(
  {
    id: 'process-image-batch',
    retries: 1,
    triggers: [{ event: 'image/batch.process.requested' }]
  },
  async ({ event, step }) => {
    const { imageIds, jobId } = event.data;

    await step.run('mark-batch-started', () => jobService.markJobStarted(jobId));

    for (const imageId of imageIds) {
      await step.run(`process-image-${imageId}`, async () => {
        try {
          const result = await imageProcessingService.processImageVision(imageId);
          await jobService.markJobImageResult(jobId, result);
        } catch (error) {
          await jobService.markJobFailed(jobId, error);
        }
      });
    }

    const job = await step.run('mark-batch-completed', () =>
      jobService.markJobCompleted(jobId)
    );

    return {
      jobId,
      status: job?.status,
      total: imageIds.length
    };
  }
);

module.exports = {
  processImageBatch
};
