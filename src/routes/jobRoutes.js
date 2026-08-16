const express = require('express');

const jobController = require('../controllers/jobController');
const validate = require('../middleware/validation');
const { jobListQuerySchema } = require('../schemas/apiSchemas');

const router = express.Router();

router.get('/', validate(jobListQuerySchema, 'query'), jobController.listJobs);
router.post('/process-pending-images', jobController.processPendingImages);
router.get('/:id', jobController.getJob);

module.exports = router;
