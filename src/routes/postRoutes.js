const express = require('express');

const postController = require('../controllers/postController');
const validate = require('../middleware/validation');
const { createPostSchema, updatePostSchema } = require('../schemas/apiSchemas');

const router = express.Router();

router.post('/', validate(createPostSchema), postController.createPost);
router.get('/', postController.listPosts);
router.get('/:id', postController.getPost);
router.patch('/:id', validate(updatePostSchema), postController.updatePost);
router.delete('/:id', postController.deletePost);

module.exports = router;
