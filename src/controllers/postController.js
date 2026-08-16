const postService = require('../services/postService');

async function createPost(req, res, next) {
  try {
    const post = await postService.createPost(req.body);
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
}

async function listPosts(req, res, next) {
  try {
    const posts = await postService.listPosts();
    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
}

async function getPost(req, res, next) {
  try {
    const post = await postService.getPostById(req.params.id);
    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
}

async function deletePost(req, res, next) {
  try {
    const post = await postService.deletePost(req.params.id);
    res.status(200).json({ post, deleted: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost
};
