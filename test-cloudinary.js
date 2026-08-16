require('dotenv').config();

const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function main() {
  try {
    console.log('Cloudinary configuration check:');
    console.log(
      'Cloud name:',
      process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING'
    );
    console.log(
      'API key:',
      process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING'
    );
    console.log(
      'API secret:',
      process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
    );

    const result = await cloudinary.api.ping();

    console.log('\nCloudinary ping successful:');
    console.log(result);
  } catch (error) {
    console.error('\nCloudinary ping failed:');
    console.error('Message:', error.message);
    console.error('HTTP code:', error.http_code || error.httpCode || 'unknown');

    if (error.error) {
      console.error('Cloudinary error:', error.error);
    }

    if (error.response) {
      console.error('Response:', error.response);
    }

    process.exitCode = 1;
  }
}

main();