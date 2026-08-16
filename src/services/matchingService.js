const Image = require('../models/Image');
const Post = require('../models/Post');
const Suggestion = require('../models/Suggestion');
const embeddingService = require('./embeddingService');
const mismatchGuardService = require('./mismatchGuardService');
const cosineSimilarity = require('../utils/cosineSimilarity');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

function hasEmbedding(entity) {
  return Array.isArray(entity.embedding) && entity.embedding.length > 0;
}

async function ensurePostEmbedding(post, options = {}) {
  if (hasEmbedding(post)) {
    return post;
  }

  const result = await embeddingService.generatePostEmbedding(post, {
    ...options,
    postId: post._id
  });
  post.embedding = result.embedding;
  post.embeddingModel = result.model;
  await post.save();
  return post;
}

async function getCandidateImages(candidateImageIds) {
  const query = {
    processingStatus: 'completed',
    embedding: { $exists: true, $ne: [] }
  };

  if (candidateImageIds?.length) {
    query._id = { $in: candidateImageIds };
  }

  return Image.find(query);
}

async function persistSuggestion({ post, image, similarityScore, guard }) {
  return Suggestion.create({
    postId: post._id,
    imageId: image?._id,
    similarityScore,
    guardStatus: guard.guardStatus,
    guardReasons: guard.reasons,
    decision: guard.decision,
    decisionReason: guard.decisionReason
  });
}

function rankCandidates(post, images) {
  return images
    .filter(hasEmbedding)
    .map((image) => ({
      image,
      similarityScore: cosineSimilarity(post.embedding, image.embedding)
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

async function matchImagesForPost(postId, options = {}) {
  const post = await Post.findById(postId);

  if (!post) {
    throw new NotFoundError('Post not found');
  }

  await ensurePostEmbedding(post, options);

  if (!hasEmbedding(post)) {
    throw new ValidationError('Post does not have an embedding');
  }

  const images = await getCandidateImages(options.candidateImageIds);
  const rankedCandidates = rankCandidates(post, images);
  const evaluated = [];

  for (const candidate of rankedCandidates) {
    const guard = mismatchGuardService.evaluateCandidate({
      post,
      image: candidate.image,
      similarityScore: candidate.similarityScore
    });
    const suggestion = await persistSuggestion({
      post,
      image: candidate.image,
      similarityScore: candidate.similarityScore,
      guard
    });

    evaluated.push({
      suggestionId: suggestion._id,
      imageId: candidate.image._id,
      similarityScore: candidate.similarityScore,
      guardStatus: guard.guardStatus,
      decision: guard.decision,
      reason: guard.decisionReason,
      guardReasons: guard.reasons,
      image: {
        subject: candidate.image.subject,
        category: candidate.image.category,
        confidence: candidate.image.confidence,
        cloudinaryUrl: candidate.image.cloudinaryUrl
      }
    });
  }

  const accepted = evaluated.filter((candidate) => candidate.guardStatus === 'accepted');

  logger.info('matching_performed', {
    postId: post._id?.toString(),
    candidates: evaluated.length,
    accepted: accepted.length
  });

  if (accepted.length === 0) {
    const reasons =
      evaluated.length === 0
        ? ['No completed images with embeddings were available']
        : [
            'No candidate passed the mismatch guard',
            ...Array.from(
              new Set(evaluated.flatMap((candidate) => candidate.guardReasons))
            )
          ];

    const guard = {
      guardStatus: 'rejected',
      decision: 'no_confident_match',
      reasons,
      decisionReason: reasons.join('; ')
    };
    const suggestion = await persistSuggestion({
      post,
      image: null,
      similarityScore: undefined,
      guard
    });

    return {
      postId: post._id,
      status: 'no_confident_match',
      suggestions: [],
      rejectedCandidates: evaluated,
      reasons,
      noConfidentMatchSuggestionId: suggestion._id
    };
  }

  return {
    postId: post._id,
    status: 'matched',
    suggestions: accepted,
    rejectedCandidates: evaluated.filter(
      (candidate) => candidate.guardStatus !== 'accepted'
    )
  };
}

module.exports = {
  ensurePostEmbedding,
  getCandidateImages,
  matchImagesForPost,
  rankCandidates
};
