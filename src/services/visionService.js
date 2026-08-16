const env = require('../config/env');
const { getGeminiConfig } = require('../config/gemini');
const { imageMetadataSchema } = require('../schemas/imageMetadataSchema');
const costTrackingService = require('./costTrackingService');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const VISION_PROMPT = [
  'Analyze this image for a content matching system.',
  'Return only strict JSON with this exact shape:',
  '{"subject":"red fox","category":"animal","attributes":["orange fur"],"caption":"A red fox standing in a forest","confidence":0.94}',
  'Rules:',
  '- subject must name the primary visible subject.',
  '- category must be a broad category such as animal, person, product, place, food, chart, or object.',
  '- attributes must contain concise visible traits.',
  '- confidence must be a number from 0 to 1.',
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

function parseVisionJson(text) {
  const cleaned = stripJsonFence(text);
  return imageMetadataSchema.parse(JSON.parse(cleaned));
}

async function recordVisionUsageIfPossible(options, config, usage) {
  if (!options.imageId && !options.postId) {
    return;
  }

  try {
    await costTrackingService.recordAIUsage({
      provider: 'google',
      model: config.visionModel,
      operation: 'vision',
      imageId: options.imageId,
      postId: options.postId,
      usage
    });
  } catch (error) {
    logger.error('ai_usage_record_failed', {
      operation: 'vision',
      message: error.message
    });
  }
}

async function callGeminiVision({ imageUrl, mimeType }, fetchImpl = fetch) {
  const config = getGeminiConfig();

  // Download the image from Cloudinary.
  const imageResponse = await fetchImpl(imageUrl);

  if (!imageResponse.ok) {
    const body = await imageResponse.text();

    throw new AppError('Image download failed', 502, {
      status: imageResponse.status,
      body
    });
  }

  const imageContentType =
    imageResponse.headers.get('content-type') ||
    mimeType ||
    'image/jpeg';

  if (!imageContentType.startsWith('image/')) {
    throw new AppError('Downloaded resource is not an image', 502, {
      contentType: imageContentType
    });
  }

  const imageBuffer = Buffer.from(
    await imageResponse.arrayBuffer()
  );

  const base64Image = imageBuffer.toString('base64');

  const endpoint =
    `${config.baseUrl}/models/${config.visionModel}:generateContent?key=${config.apiKey}`;

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
            {
              text: VISION_PROMPT
            },
            {
              inlineData: {
                mimeType: imageContentType,
                data: base64Image
              }
            }
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

  throw new AppError('Gemini vision request failed', 502, {
    status: response.status,
    body
  });
}

  return response.json();
}

async function analyzeImage({ imageUrl, mimeType }, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const maxAttempts = options.maxAttempts || env.visionMaxAttempts;
  const config = getGeminiConfig();
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let usageRecorded = false;

    try {
      logger.info('vision_analysis_started', { attempt });
      const responseJson = await callGeminiVision({ imageUrl, mimeType }, fetchImpl);
      const usage = costTrackingService.usageFromGeminiResponse(responseJson);
      await recordVisionUsageIfPossible(options, config, usage);
      usageRecorded = true;

      const text = extractTextFromGeminiResponse(responseJson);
      const metadata = parseVisionJson(text);
      const status =
        metadata.confidence < env.visionConfidenceThreshold
          ? 'flagged'
          : 'completed';

      logger.info('vision_analysis_completed', {
        attempt,
        subject: metadata.subject,
        confidence: metadata.confidence,
        status
      });

      return {
        metadata,
        status,
        attempts: attempt,
        reason:
          status === 'flagged'
            ? `Vision confidence ${metadata.confidence} is below threshold ${env.visionConfidenceThreshold}`
            : 'Vision metadata validated'
      };
    } catch (error) {
      if (!usageRecorded) {
        await recordVisionUsageIfPossible(options, config, {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        });
      }

      lastError = error;
      logger.error('vision_analysis_failed', {
        attempt,
        message: error.message
      });
    }
  }

  throw new AppError('Vision analysis failed after retry exhaustion', 502, {
    attempts: maxAttempts,
    cause: lastError?.message
  });
}

module.exports = {
  VISION_PROMPT,
  analyzeImage,
  parseVisionJson,
  extractTextFromGeminiResponse
};
