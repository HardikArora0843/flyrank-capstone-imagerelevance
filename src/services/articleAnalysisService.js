const env = require('../config/env');
const { getGeminiConfig } = require('../config/gemini');
const { articleMetadataSchema } = require('../schemas/articleMetadataSchema');
const costTrackingService = require('./costTrackingService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const ARTICLE_ANALYSIS_PROMPT = [
  'Analyze this blog post for image matching.',
  'Return only strict JSON with this exact shape:',
  '{"subject":"red fox","category":"animal","keywords":["fox","wildlife","behavior","habitat"]}',
  'Rules:',
  '- subject must identify the primary topic an image should depict.',
  '- category must be broad and compatible with image categories.',
  '- keywords must be concise content-matching terms.',
  '- Do not wrap the JSON in markdown.'
].join('\n');

function extractTextFromGeminiResponse(responseJson) {
  return (
    responseJson?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || ''
  );
}

function stripJsonFence(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseArticleJson(text) {
  return articleMetadataSchema.parse(JSON.parse(stripJsonFence(text)));
}

async function recordArticleUsageIfPossible(options, config, usage) {
  if (!options.postId) {
    return;
  }

  try {
    await costTrackingService.recordAIUsage({
      provider: 'google',
      model: config.textModel,
      operation: 'article_analysis',
      postId: options.postId,
      usage
    });
  } catch (error) {
    logger.error('ai_usage_record_failed', {
      operation: 'article_analysis',
      message: error.message
    });
  }
}

async function callGeminiArticleAnalysis({ title, content }, fetchImpl = fetch) {
  const config = getGeminiConfig();
  const endpoint = `${config.baseUrl}/models/${config.textModel}:generateContent?key=${config.apiKey}`;

  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: ARTICLE_ANALYSIS_PROMPT },
            { text: `Title: ${title}\n\nContent:\n${content}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError('Gemini article analysis request failed', 502, {
      status: response.status,
      body
    });
  }

  return response.json();
}

async function analyzeArticle({ title, content }, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const maxAttempts = options.maxAttempts || env.articleAnalysisMaxAttempts;
  const config = getGeminiConfig();
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let usageRecorded = false;

    try {
      logger.info('article_analysis_started', { attempt });
      const responseJson = await callGeminiArticleAnalysis(
        { title, content },
        fetchImpl
      );
      const usage = costTrackingService.usageFromGeminiResponse(responseJson);
      await recordArticleUsageIfPossible(options, config, usage);
      usageRecorded = true;

      const metadata = parseArticleJson(extractTextFromGeminiResponse(responseJson));

      logger.info('article_analysis_completed', {
        attempt,
        subject: metadata.subject,
        category: metadata.category
      });

      return {
        metadata,
        attempts: attempt,
        reason: 'Article metadata validated'
      };
    } catch (error) {
      if (!usageRecorded) {
        await recordArticleUsageIfPossible(options, config, {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        });
      }

      lastError = error;
      logger.error('article_analysis_failed', {
        attempt,
        message: error.message
      });
    }
  }

  throw new AppError('Article analysis failed after retry exhaustion', 502, {
    attempts: maxAttempts,
    cause: lastError?.message
  });
}

module.exports = {
  ARTICLE_ANALYSIS_PROMPT,
  analyzeArticle,
  parseArticleJson,
  extractTextFromGeminiResponse
};
