const { Readable } = require('stream');

const { cloudinary, configureCloudinary } = require('../config/cloudinary');

function uploadBuffer(buffer, options = {}) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'flyrank-capstone-image-relevance',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

async function deleteImage(publicId) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = {
  uploadBuffer,
  deleteImage
};
