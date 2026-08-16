const request = require('supertest');

jest.mock('../../src/services/jobService', () => ({
  createPendingBatchJob: jest.fn(),
  getJobById: jest.fn(),
  listJobs: jest.fn()
}));

const app = require('../../src/app');
const jobService = require('../../src/services/jobService');

describe('/api/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists jobs with optional status filter', async () => {
    jobService.listJobs.mockResolvedValue([
      {
        jobId: 'process_image:image-1',
        status: 'pending'
      }
    ]);

    const response = await request(app).get('/api/jobs?status=pending');

    expect(response.status).toBe(200);
    expect(response.body.jobs).toHaveLength(1);
    expect(jobService.listJobs).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('rejects invalid job status filters', async () => {
    const response = await request(app).get('/api/jobs?status=weird');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request payload');
  });

  it('returns a job by id', async () => {
    const job = {
      jobId: 'process_image:image-1',
      status: 'completed'
    };
    jobService.getJobById.mockResolvedValue(job);

    const response = await request(app).get('/api/jobs/process_image:image-1');

    expect(response.status).toBe(200);
    expect(response.body.job).toEqual(job);
  });

  it('starts a pending image batch job', async () => {
    const job = {
      jobId: 'process_image_batch:123',
      status: 'pending',
      total: 2
    };
    jobService.createPendingBatchJob.mockResolvedValue(job);

    const response = await request(app).post('/api/jobs/process-pending-images');

    expect(response.status).toBe(202);
    expect(response.body.job).toEqual(job);
  });
});
