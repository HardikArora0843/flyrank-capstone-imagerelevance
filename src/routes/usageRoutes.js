const express = require('express');

const usageController = require('../controllers/usageController');
const validate = require('../middleware/validation');
const { usageQuerySchema } = require('../schemas/apiSchemas');

const router = express.Router();

router.get('/', validate(usageQuerySchema, 'query'), usageController.listUsage);
router.get('/summary', validate(usageQuerySchema, 'query'), usageController.summarizeUsage);

module.exports = router;
