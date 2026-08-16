const express = require('express');

const imageController = require('../controllers/imageController');
const upload = require('../middleware/upload');
const validate = require('../middleware/validation');
const { imageListQuerySchema } = require('../schemas/apiSchemas');

const router = express.Router();

router.post('/', upload.single('image'), imageController.createImage);
router.get('/', validate(imageListQuerySchema, 'query'), imageController.listImages);
router.get('/:id', imageController.getImage);
router.delete('/:id', imageController.deleteImage);

module.exports = router;
