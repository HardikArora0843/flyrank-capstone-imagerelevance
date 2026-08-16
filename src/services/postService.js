const Post = require('../models/Post');
const articleAnalysisService = require('./articleAnalysisService');
const embeddingService = require('./embeddingService');
const { NotFoundError } = require('../utils/errors');

async function createPost(data, options = {}) {
  const analysis = await articleAnalysisService.analyzeArticle(
    {
      title: data.title,
      content: data.content
    },
    options
  );

  const post = await Post.create({
    title: data.title,
    content: data.content,
    subject: analysis.metadata.subject,
    category: analysis.metadata.category,
    keywords: analysis.metadata.keywords
  });

  const embeddingResult = await embeddingService.generatePostEmbedding(post, {
    ...options,
    postId: post._id
  });
  post.embedding = embeddingResult.embedding;
  post.embeddingModel = embeddingResult.model;
  await post.save();

  return post;
}

async function listPosts() {
  return Post.find({}).sort({ createdAt: -1 });
}

async function getPostById(id) {
  const post = await Post.findById(id);

  if (!post) {
    throw new NotFoundError('Post not found');
  }

  return post;
}

async function updatePost(id, data, options = {}) {
  const post = await getPostById(id);

  if (data.title !== undefined) {
    post.title = data.title;
  }

  if (data.content !== undefined) {
    post.content = data.content;
  }

  if (data.title !== undefined || data.content !== undefined) {
    const analysis = await articleAnalysisService.analyzeArticle(
      {
        title: post.title,
        content: post.content
      },
      {
        ...options,
        postId: post._id
      }
    );
    post.subject = analysis.metadata.subject;
    post.category = analysis.metadata.category;
    post.keywords = analysis.metadata.keywords;

    const embeddingResult = await embeddingService.generatePostEmbedding(post, {
      ...options,
      postId: post._id
    });
    post.embedding = embeddingResult.embedding;
    post.embeddingModel = embeddingResult.model;
  }

  await post.save();
  return post;
}

async function deletePost(id) {
  const post = await getPostById(id);
  await post.deleteOne();
  return post;
}

module.exports = {
  createPost,
  deletePost,
  getPostById,
  listPosts,
  updatePost
};
