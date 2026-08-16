const env = require('./env');

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY || env.geminiApiKey;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  return {
    apiKey,
    baseUrl: process.env.GEMINI_API_BASE_URL || env.geminiApiBaseUrl,
    visionModel: process.env.GEMINI_VISION_MODEL || env.geminiVisionModel,
    textModel: process.env.GEMINI_TEXT_MODEL || env.geminiTextModel,
    embeddingModel:
      process.env.GEMINI_EMBEDDING_MODEL || env.geminiEmbeddingModel
  };
}

module.exports = {
  getGeminiConfig
};
