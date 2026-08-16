const matchingService = require('../services/matchingService');

async function matchImagesForPost(req, res, next) {
  try {
    const result = await matchingService.matchImagesForPost(req.params.id, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  matchImagesForPost
};
