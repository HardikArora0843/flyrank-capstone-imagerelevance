const fs = require('fs');
const path = require('path');

const { connectDB, disconnectDB } = require('../src/config/db');
const Image = require('../src/models/Image');
const cloudinaryService = require('../src/services/cloudinaryService');
const imageProcessingService = require('../src/services/imageProcessingService');
const logger = require('../src/utils/logger');

const IMAGES_DIR = path.join(__dirname, '..', 'dataset', 'images');

const DEMO_IMAGES = [
  {
    filename: 'red-fox.jpg',
    label: 'red fox'
  },
  {
    filename: 'gray-wolf.jpg',
    label: 'gray wolf'
  },
  {
    filename: 'dog.jpg',
    label: 'dog'
  },
  {
    filename: 'unrelated.jpg',
    label: 'unrelated'
  }
];

function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();

  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

function validateImageFiles() {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(
      `Image directory not found: ${IMAGES_DIR}. Create dataset/images and add the demo images.`
    );
  }

  for (const demoImage of DEMO_IMAGES) {
    const filePath = path.join(IMAGES_DIR, demoImage.filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Missing demo image: ${filePath}`
      );
    }
  }
}

async function seedImage({ filename, label }) {
  const filePath = path.join(IMAGES_DIR, filename);

  const existing = await Image.findOne({
    originalFilename: filename
  });

  if (existing) {
  logger.info('seed_image_exists', {
    filename,
    imageId: existing._id.toString(),
    processingStatus: existing.processingStatus
  });

  if (
    existing.processingStatus === 'pending' ||
    existing.processingStatus === 'failed'
  ) {
    const result = await imageProcessingService.processImageVision(
      existing._id,
      {
        mimeType: getMimeType(filename)
      }
    );

    logger.info('seed_image_processed', {
      filename,
      imageId: existing._id.toString(),
      status: result.image.processingStatus,
      subject: result.image.subject,
      category: result.image.category,
      confidence: result.image.confidence
    });

    return result.image;
  }

  return existing;
}

  const buffer = fs.readFileSync(filePath);

  logger.info('seed_image_upload_started', {
    filename,
    label
  });

  const uploaded = await cloudinaryService.uploadBuffer(buffer, {
    folder: 'flyrank-capstone-image-relevance/demo'
  });

  const image = await Image.create({
    cloudinaryUrl: uploaded.secureUrl,
    cloudinaryPublicId: uploaded.publicId,
    originalFilename: filename,
    processingStatus: 'pending'
  });

  logger.info('seed_image_uploaded', {
    filename,
    imageId: image._id.toString()
  });

  try {
    const result = await imageProcessingService.processImageVision(
      image._id,
      {
        mimeType: getMimeType(filename)
      }
    );

    logger.info('seed_image_processed', {
      filename,
      imageId: image._id.toString(),
      status: result.image.processingStatus,
      subject: result.image.subject,
      category: result.image.category,
      confidence: result.image.confidence
    });

    return result.image;
  } catch (error) {
    logger.error('seed_image_processing_failed', {
      filename,
      imageId: image._id.toString(),
      message: error.message
    });

    throw error;
  }
}

async function main() {
  try {
    validateImageFiles();
    await connectDB();

    const results = [];

    for (const demoImage of DEMO_IMAGES) {
      const image = await seedImage(demoImage);

      results.push({
        filename: image.originalFilename,
        imageId: image._id.toString(),
        subject: image.subject || null,
        category: image.category || null,
        confidence: image.confidence ?? null,
        processingStatus: image.processingStatus
      });
    }

    console.log('\nDemo images seeded successfully:\n');

    console.table(results);
  } catch (error) {
  logger.error('seed_images_failed', {
    message: error.message,
    httpCode: error.http_code || error.httpCode || null,
    name: error.name || null,
    error: error.error || null
  });

  console.error('\nCloudinary error details:');
  console.error('Message:', error.message);
  console.error('HTTP code:', error.http_code || error.httpCode || 'unknown');

  if (error.error) {
    console.error('Cloudinary response:', error.error);
  }

  process.exitCode = 1;
}finally {
    await disconnectDB();
  }
}

main();