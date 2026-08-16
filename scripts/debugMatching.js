const { connectDB, disconnectDB } = require('../src/config/db');
const Post = require('../src/models/Post');
const Image = require('../src/models/Image');
const cosineSimilarityModule = require('../src/utils/cosineSimilarity');

const DEMO_POST_TITLES = [
  'The Behavior of Red Foxes',
  'Understanding Gray Wolves',
  'Best Practices for Remote Work'
];

const cosineSimilarity =
  typeof cosineSimilarityModule === 'function'
    ? cosineSimilarityModule
    : cosineSimilarityModule.cosineSimilarity;

async function main() {
  try {
    await connectDB();

    if (typeof cosineSimilarity !== 'function') {
      throw new Error(
        'Unable to load cosineSimilarity from src/utils/cosineSimilarity.js'
      );
    }

    const posts = await Post.find({
      title: { $in: DEMO_POST_TITLES }
    });

    const images = await Image.find({
      processingStatus: 'completed',
      embedding: { $exists: true, $ne: [] }
    });

    if (posts.length === 0) {
      throw new Error(
        'No demo posts found. Run npm run seed:posts first.'
      );
    }

    if (images.length === 0) {
      throw new Error(
        'No completed images with embeddings found. Run npm run seed:images first.'
      );
    }

    console.log('\n========================================');
    console.log('MATCHING EMBEDDING DIAGNOSTIC');
    console.log('========================================');

    console.log(`Posts found: ${posts.length}`);
    console.log(`Images found: ${images.length}`);

    for (const post of posts) {
      console.log('\n========================================');
      console.log(`POST: ${post.title}`);
      console.log(`Post ID: ${post._id}`);
      console.log(`Subject: ${post.subject}`);
      console.log(`Category: ${post.category}`);
      console.log(
        `Embedding dimensions: ${
          Array.isArray(post.embedding) ? post.embedding.length : 0
        }`
      );
      console.log('========================================');

      if (!Array.isArray(post.embedding) || post.embedding.length === 0) {
        console.log('POST HAS NO EMBEDDING');
        continue;
      }

      const ranked = images
        .filter(
          (image) =>
            Array.isArray(image.embedding) &&
            image.embedding.length > 0
        )
        .map((image) => {
          if (post.embedding.length !== image.embedding.length) {
            return {
              filename: image.originalFilename,
              imageId: image._id.toString(),
              subject: image.subject,
              category: image.category,
              confidence: image.confidence,
              dimensions: image.embedding.length,
              similarity: null,
              dimensionMismatch: true
            };
          }

          return {
            filename: image.originalFilename,
            imageId: image._id.toString(),
            subject: image.subject,
            category: image.category,
            confidence: image.confidence,
            dimensions: image.embedding.length,
            similarity: cosineSimilarity(
              post.embedding,
              image.embedding
            ),
            dimensionMismatch: false
          };
        })
        .sort((a, b) => {
          if (a.similarity === null) return 1;
          if (b.similarity === null) return -1;

          return b.similarity - a.similarity;
        });

      for (const candidate of ranked) {
        if (candidate.dimensionMismatch) {
          console.log(
            `${candidate.filename.padEnd(18)} ` +
              `similarity=N/A ` +
              `DIMENSION MISMATCH ` +
              `post=${post.embedding.length} ` +
              `image=${candidate.dimensions}`
          );

          continue;
        }

        console.log(
          `${candidate.filename.padEnd(18)} ` +
            `similarity=${candidate.similarity.toFixed(4)} ` +
            `subject="${candidate.subject}" ` +
            `category="${candidate.category}" ` +
            `confidence=${candidate.confidence}`
        );
      }
    }

    console.log('\n========================================');
    console.log('DIAGNOSTIC COMPLETE');
    console.log('========================================\n');
  } catch (error) {
    console.error('\nMatching diagnostic failed:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

main();