const Image = require('../models/Image');
const cloudinaryService = require('./cloudinaryService');
const jobService = require('./jobService');

async function createImageFromUpload(file) {
  const uploaded = await cloudinaryService.uploadBuffer(file.buffer, {
    folder: 'flyrank-capstone-image-relevance'
  });

  const image = await Image.create({
    cloudinaryUrl: uploaded.secureUrl,
    cloudinaryPublicId: uploaded.publicId,
    originalFilename: file.originalname,
    processingStatus: 'pending'
  });

  await jobService.createImageProcessingJob(image._id);

  return image;
}

async function listImages(filters = {}) {
  const query = {};

  if (filters.processingStatus) {
    query.processingStatus = filters.processingStatus;
  }

  return Image.find(query).sort({ createdAt: -1 });
}

async function getImageById(id) {
  return Image.findById(id);
}

async function deleteImageById(id) {
  const image = await Image.findById(id);
  if (!image) {
    return null;
  }

  await cloudinaryService.deleteImage(image.cloudinaryPublicId);
  await image.deleteOne();

  return image;
}

module.exports = {
  createImageFromUpload,
  listImages,
  getImageById,
  deleteImageById
};
