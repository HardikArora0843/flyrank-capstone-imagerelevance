const costTrackingService = require('../services/costTrackingService');

async function listUsage(req, res, next) {
  try {
    const usage = await costTrackingService.listAIUsage(req.query);
    res.status(200).json({ usage });
  } catch (error) {
    next(error);
  }
}

async function summarizeUsage(req, res, next) {
  try {
    const summary = await costTrackingService.summarizeAIUsage(req.query);
    res.status(200).json({ summary });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsage,
  summarizeUsage
};
