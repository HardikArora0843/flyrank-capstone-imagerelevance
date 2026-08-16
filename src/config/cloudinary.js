const { v2: cloudinary } = require('cloudinary');

const env = require('./env');

function configureCloudinary() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error('Cloudinary credentials are required');
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true
  });

  return cloudinary;
}

module.exports = {
  cloudinary,
  configureCloudinary
};
