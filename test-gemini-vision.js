require('dotenv').config();

const mongoose = require('mongoose');
const Image = require('./src/models/Image');

async function testGeminiVision() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_VISION_MODEL;

  await mongoose.connect(process.env.MONGODB_URI);

  console.log('MongoDB connected');

  const image = await Image.findOne({
    originalFilename: 'red-fox.jpg'
  });

  if (!image) {
    throw new Error('red-fox.jpg was not found in MongoDB');
  }

  console.log('\nImage found in MongoDB');
  console.log('Image ID:', image._id.toString());
  console.log('Filename:', image.originalFilename);
  console.log('Cloudinary URL:', image.cloudinaryUrl);

  // Download image from Cloudinary
  const imageResponse = await fetch(image.cloudinaryUrl);

  console.log('\nCloudinary HTTP status:', imageResponse.status);

  if (!imageResponse.ok) {
    const errorBody = await imageResponse.text();

    throw new Error(
      `Cloudinary image download failed: ${imageResponse.status}\n${errorBody}`
    );
  }

  const contentType =
    imageResponse.headers.get('content-type') || 'image/jpeg';

  const imageBuffer = Buffer.from(
    await imageResponse.arrayBuffer()
  );

  console.log('Content-Type:', contentType);
  console.log('Image size:', imageBuffer.length, 'bytes');

  // Convert image to Base64
  const base64Image = imageBuffer.toString('base64');

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log('\nSending image to Gemini...');
  console.log('Gemini model:', model);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `
Analyze this image.

Return ONLY valid JSON:

{
  "subject": "primary visible subject",
  "category": "broad category",
  "attributes": ["visible attribute 1", "visible attribute 2"],
  "caption": "short description of the image",
  "confidence": 0.95
}

Rules:
- subject must identify the primary visible subject.
- category should be broad, such as animal, person, product, place, food, chart, or object.
- attributes must contain concise visible traits.
- confidence must be between 0 and 1.
- Do not use markdown.
              `.trim()
            },
            {
              inlineData: {
                mimeType: contentType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  const body = await response.text();

  console.log('\n========== GEMINI RESPONSE ==========');
  console.log('HTTP status:', response.status);
  console.log('Response body:', body);
  console.log('======================================');
}

testGeminiVision()
  .catch((error) => {
    console.error('\nTEST FAILED');
    console.error(error);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });