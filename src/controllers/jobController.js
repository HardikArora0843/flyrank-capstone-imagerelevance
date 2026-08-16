const jobService = require('../services/jobService');

async function listJobs(req, res, next) {
  try {
    const jobs = await jobService.listJobs(req.query);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
}

async function getJob(req, res, next) {
  try {
    const job = await jobService.getJobById(req.params.id);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
}

async function processPendingImages(req, res, next) {
  try {
    const job = await jobService.createPendingBatchJob();
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJob,
  listJobs,
  processPendingImages
};
