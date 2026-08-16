const { getGeminiConfig } = require('../config/gemini');
const costTrackingService = require('./costTrackingService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

function buildImageEmbeddingText(image) {
  const attributes = Array.isArray(image.attributes)
    ? image.attributes.join(', ')
    : '';

  return [
    image.caption,
    `Subject: ${image.subject || ''}.`,
    `Category: ${image.category || ''}.`,
    `Attributes: ${attributes}.`
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function buildPostEmbeddingText(post) {
  const keywords = Array.isArray(post.keywords) ? post.keywords.join(', ') : '';

  return [
    post.title,
    post.content,
    `Subject: ${post.subject || ''}.`,
    `Category: ${post.category || ''}.`,
    `Keywords: ${keywords}.`
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function extractEmbedding(responseJson = {}) {
  const values =
    responseJson.embeddings?.[0]?.values ||
    responseJson.embedding?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new AppError(
      'Gemini embedding response did not include values',
      502
    );
  }

  if (
    values.some(
      (value) => typeof value !== 'number' || Number.isNaN(value)
    )
  ) {
    throw new AppError(
      'Gemini embedding response contained invalid values',
      502
    );
  }

  return values;
}

async function recordEmbeddingUsageIfPossible(options, config, usage) {
  if (!options.imageId && !options.postId) {
    return;
  }

  try {
    await costTrackingService.recordAIUsage({
      provider: 'google',
      model: config.embeddingModel,
      operation: 'embedding',
      imageId: options.imageId,
      postId: options.postId,
      usage
    });
  } catch (error) {
    logger.error('ai_usage_record_failed', {
      operation: 'embedding',
      message: error.message
    });
  }
}

async function generateEmbedding(text, options = {}) {
  if (!text || !text.trim()) {
    throw new AppError('Embedding text is required', 400);
  }

  const config = getGeminiConfig();
  const fetchImpl = options.fetchImpl || fetch;
  const endpoint = `${config.baseUrl}/models/${config.embeddingModel}:embedContent?key=${config.apiKey}`;
  let usageRecorded = false;

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }]
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError('Gemini embedding request failed', 502, {
        status: response.status,
        body
      });
    }

    const responseJson = await response.json();
    const usage =
      costTrackingService.usageFromGeminiEmbeddingResponse(responseJson);
    await recordEmbeddingUsageIfPossible(options, config, usage);
    usageRecorded = true;

    return {
      embedding: extractEmbedding(responseJson),
      model: config.embeddingModel,
      usage
    };
  } catch (error) {
    if (!usageRecorded) {
      await recordEmbeddingUsageIfPossible(options, config, {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      });
    }

    throw error;
  }
}

async function generateImageEmbedding(image, options = {}) {
  return generateEmbedding(buildImageEmbeddingText(image), {
    ...options,
    imageId: options.imageId || image._id
  });
}

async function generatePostEmbedding(post, options = {}) {
  return generateEmbedding(buildPostEmbeddingText(post), {
    ...options,
    postId: options.postId || post._id
  });
}

module.exports = {
  buildImageEmbeddingText,
  buildPostEmbeddingText,
  extractEmbedding,
  generateEmbedding,
  generateImageEmbedding,
  generatePostEmbedding
};
