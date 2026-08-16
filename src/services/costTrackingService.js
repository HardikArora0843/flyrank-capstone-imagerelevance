const AIUsage = require('../models/AIUsage');
const env = require('../config/env');
const logger = require('../utils/logger');

function usageFromGeminiResponse(responseJson = {}) {
  const metadata = responseJson.usageMetadata || {};
  const inputTokens = metadata.promptTokenCount || 0;
  const outputTokens = metadata.candidatesTokenCount || 0;
  const totalTokens = metadata.totalTokenCount || inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens
  };
}

function usageFromGeminiEmbeddingResponse(responseJson = {}) {
  const metadata = responseJson.usageMetadata || {};
  const inputTokens = metadata.promptTokenCount || 0;
  const totalTokens = metadata.totalTokenCount || inputTokens;

  return {
    inputTokens,
    outputTokens: 0,
    totalTokens
  };
}

function estimateGeminiCost(operation, usage) {
  if (operation === 'vision') {
    const inputCost =
      (usage.inputTokens / 1000) * env.geminiVisionInputCostPer1k;
    const outputCost =
      (usage.outputTokens / 1000) * env.geminiVisionOutputCostPer1k;

    return Number((inputCost + outputCost).toFixed(8));
  }

  if (operation === 'embedding') {
    return Number(
      ((usage.inputTokens / 1000) * env.geminiEmbeddingCostPer1k).toFixed(8)
    );
  }

  return 0;
}

async function recordAIUsage({
  provider = 'google',
  model,
  operation,
  imageId,
  postId,
  usage = {}
}) {
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const totalTokens = usage.totalTokens || inputTokens + outputTokens;
  const estimatedCost =
    usage.estimatedCost ??
    estimateGeminiCost(operation, { inputTokens, outputTokens, totalTokens });

  const record = await AIUsage.create({
    provider,
    model,
    operation,
    imageId,
    postId,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost
  });

  logger.info('ai_usage_recorded', {
    provider,
    model,
    operation,
    imageId,
    postId,
    totalTokens,
    estimatedCost
  });

  return record;
}

async function listAIUsage(filters = {}) {
  const query = {};

  if (filters.operation) {
    query.operation = filters.operation;
  }

  if (filters.imageId) {
    query.imageId = filters.imageId;
  }

  if (filters.postId) {
    query.postId = filters.postId;
  }

  return AIUsage.find(query).sort({ createdAt: -1 });
}

async function summarizeAIUsage(filters = {}) {
  const records = await listAIUsage(filters);

  return records.reduce(
    (summary, record) => {
      summary.records += 1;
      summary.inputTokens += record.inputTokens || 0;
      summary.outputTokens += record.outputTokens || 0;
      summary.totalTokens += record.totalTokens || 0;
      summary.estimatedCost = Number(
        (summary.estimatedCost + (record.estimatedCost || 0)).toFixed(8)
      );
      return summary;
    },
    {
      records: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0
    }
  );
}

module.exports = {
  estimateGeminiCost,
  listAIUsage,
  recordAIUsage,
  summarizeAIUsage,
  usageFromGeminiEmbeddingResponse,
  usageFromGeminiResponse
};
