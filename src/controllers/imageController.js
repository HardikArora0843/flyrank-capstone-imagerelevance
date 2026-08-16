const imageService = require('../services/imageService');
const { NotFoundError, ValidationError } = require('../utils/errors');

async function createImage(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError('Image file is required');
    }

    const image = await imageService.createImageFromUpload(req.file);

    res.status(201).json({
      image
    });
  } catch (error) {
    next(error);
  }
}

async function listImages(req, res, next) {
  try {
    const images = await imageService.listImages(req.query);

    res.status(200).json({
      images
    });
  } catch (error) {
    next(error);
  }
}

async function getImage(req, res, next) {
  try {
    const image = await imageService.getImageById(req.params.id);

    if (!image) {
      throw new NotFoundError('Image not found');
    }

    res.status(200).json({
      image
    });
  } catch (error) {
    next(error);
  }
}

async function deleteImage(req, res, next) {
  try {
    const image = await imageService.deleteImageById(req.params.id);

    if (!image) {
      throw new NotFoundError('Image not found');
    }

    res.status(200).json({
      image,
      deleted: true
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createImage,
  listImages,
  getImage,
  deleteImage
};
