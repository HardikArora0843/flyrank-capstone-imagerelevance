const { inngest } = require('../config/inngest');
const imageProcessingService = require('../services/imageProcessingService');
const jobService = require('../services/jobService');

const processImage = inngest.createFunction(
  {
    id: 'process-image',
    retries: 2,
    triggers: [{ event: 'image/process.requested' }]
  },
  async ({ event, step }) => {
    const { imageId, jobId } = event.data;

    await step.run('mark-job-started', () => jobService.markJobStarted(jobId));

    try {
      const result = await step.run('process-image-vision', () =>
        imageProcessingService.processImageVision(imageId)
      );
      await step.run('record-image-result', () =>
        jobService.markJobImageResult(jobId, result)
      );
      await step.run('mark-job-completed', () => jobService.markJobCompleted(jobId));

      return {
        imageId,
        jobId,
        status: result.image.processingStatus,
        skipped: result.skipped
      };
    } catch (error) {
      await step.run('mark-job-failed', () => jobService.markJobFailed(jobId, error));
      throw error;
    }
  }
);

module.exports = {
  processImage
};
