const Image = require('../models/Image');
const visionService = require('./visionService');
const embeddingService = require('./embeddingService');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

async function processImageVision(imageId, options = {}) {
  const image = await Image.findById(imageId);

  if (!image) {
    throw new NotFoundError('Image not found');
  }

  if (image.processingStatus === 'completed') {
    return {
      image,
      skipped: true,
      reason: 'Image already completed'
    };
  }

  image.processingStatus = 'processing';
  image.processingAttempts += 1;
  image.processingError = undefined;
  await image.save();

  try {
    const result = await visionService.analyzeImage(
      {
        imageUrl: image.cloudinaryUrl,
        mimeType: options.mimeType
      },
      {
        ...options,
        imageId: image._id
      }
    );

    image.subject = result.metadata.subject;
    image.category = result.metadata.category;
    image.attributes = result.metadata.attributes;
    image.caption = result.metadata.caption;
    image.confidence = result.metadata.confidence;
    image.processingStatus = result.status;
    image.processingError = result.status === 'flagged' ? result.reason : undefined;

    if (result.status === 'completed') {
      const embeddingResult = await embeddingService.generateImageEmbedding(image, {
        ...options,
        imageId: image._id
      });
      image.embedding = embeddingResult.embedding;
      image.embeddingModel = embeddingResult.model;
    }

    await image.save();

    logger.info('image_vision_metadata_saved', {
      imageId: image.id,
      status: image.processingStatus
    });

    return {
      image,
      skipped: false,
      reason: result.reason
    };
  } catch (error) {
    image.processingStatus = 'failed';
    image.processingError = error.message;
    await image.save();
    throw error;
  }
}

module.exports = {
  processImageVision
};
