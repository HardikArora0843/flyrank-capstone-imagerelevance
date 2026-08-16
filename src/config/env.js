require('dotenv').config();

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a number`);
  }

  return parsed;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: numberFromEnv('PORT', 5000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitMax: numberFromEnv('RATE_LIMIT_MAX', 300),
  mongodbUri: process.env.MONGODB_URI || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiVisionModel: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash',
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-1.5-flash',
  geminiEmbeddingModel:
    process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  geminiApiBaseUrl:
    process.env.GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com/v1beta',
  visionMaxAttempts: numberFromEnv('VISION_MAX_ATTEMPTS', 3),
  articleAnalysisMaxAttempts: numberFromEnv('ARTICLE_ANALYSIS_MAX_ATTEMPTS', 3),
  geminiVisionInputCostPer1k: numberFromEnv('GEMINI_VISION_INPUT_COST_PER_1K', 0),
  geminiVisionOutputCostPer1k: numberFromEnv('GEMINI_VISION_OUTPUT_COST_PER_1K', 0),
  geminiEmbeddingCostPer1k: numberFromEnv('GEMINI_EMBEDDING_COST_PER_1K', 0),
  visionConfidenceThreshold: numberFromEnv('VISION_CONFIDENCE_THRESHOLD', 0.7),
  similarityThreshold: numberFromEnv('SIMILARITY_THRESHOLD', 0.75)
};

module.exports = env;
