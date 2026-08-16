const express = require('express');

const matchingController = require('../controllers/matchingController');
const validate = require('../middleware/validation');
const { matchingQuerySchema } = require('../schemas/apiSchemas');

const router = express.Router({ mergeParams: true });

router.get('/images', validate(matchingQuerySchema, 'query'), matchingController.matchImagesForPost);

module.exports = router;
