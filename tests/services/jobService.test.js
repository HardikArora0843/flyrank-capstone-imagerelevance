jest.mock('../../src/models/Job', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

jest.mock('../../src/models/Image', () => ({
  find: jest.fn()
}));

jest.mock('../../src/config/inngest', () => ({
  inngest: {
    send: jest.fn()
  }
}));

const Image = require('../../src/models/Image');
const Job = require('../../src/models/Job');
const { inngest } = require('../../src/config/inngest');
const jobService = require('../../src/services/jobService');

describe('jobService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an idempotent image processing job and sends an Inngest event', async () => {
    const job = {
      jobId: 'process_image:image-1',
      type: 'process_image',
      status: 'pending'
    };
    Job.findOneAndUpdate.mockResolvedValue(job);
    inngest.send.mockResolvedValue({ ids: ['event-1'] });

    const result = await jobService.createImageProcessingJob('image-1');

    expect(result).toBe(job);
    expect(Job.findOneAndUpdate).toHaveBeenCalledWith(
      { jobId: 'process_image:image-1' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          jobId: 'process_image:image-1',
          type: 'process_image',
          total: 1
        })
      }),
      expect.objectContaining({
        upsert: true
      })
    );
    expect(inngest.send).toHaveBeenCalledWith({
      name: 'image/process.requested',
      data: {
        imageId: 'image-1',
        jobId: 'process_image:image-1'
      }
    });
  });

  it('creates a pending-image batch job', async () => {
    const select = jest.fn().mockResolvedValue([{ _id: 'image-1' }, { _id: 'image-2' }]);
    Image.find.mockReturnValue({ select });
    Job.create.mockResolvedValue({
      jobId: 'process_image_batch:123',
      total: 2
    });
    inngest.send.mockResolvedValue({ ids: ['event-1'] });

    const result = await jobService.createPendingBatchJob();

    expect(result.total).toBe(2);
    expect(Image.find).toHaveBeenCalledWith({ processingStatus: 'pending' });
    expect(Job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'process_image_batch',
        total: 2
      })
    );
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'image/batch.process.requested',
        data: expect.objectContaining({
          imageIds: ['image-1', 'image-2']
        })
      })
    );
  });

  it('marks a job completed only when progress reaches total', async () => {
    const incompleteJob = {
      total: 2,
      processed: 1,
      flagged: 0,
      failed: 0,
      save: jest.fn()
    };
    Job.findOne.mockResolvedValue(incompleteJob);

    const result = await jobService.markJobCompleted('job-1');

    expect(result).toBe(incompleteJob);
    expect(incompleteJob.save).not.toHaveBeenCalled();
  });

  it('marks failed jobs as completed_with_errors after all items finish', async () => {
    const job = {
      total: 2,
      processed: 1,
      flagged: 0,
      failed: 1,
      save: jest.fn().mockResolvedValue(undefined)
    };
    Job.findOne.mockResolvedValue(job);

    const result = await jobService.markJobCompleted('job-1');

    expect(result.status).toBe('completed_with_errors');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(job.save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when a job cannot be found', async () => {
    Job.findOne.mockResolvedValue(null);

    await expect(jobService.getJobById('missing')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404
    });
  });
});
