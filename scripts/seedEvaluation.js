const fs = require('fs');
const path = require('path');

const { connectDB, disconnectDB } = require('../src/config/db');
const Image = require('../src/models/Image');
const Post = require('../src/models/Post');
const logger = require('../src/utils/logger');

const DATASET_PATH = path.join(
  __dirname,
  '..',
  'dataset',
  'evaluation.json'
);

const EVALUATION_CASES = [
  {
    name: 'red fox article should match red fox image',
    postTitle: 'The Behavior of Red Foxes',
    expectedImageFilename: 'red-fox.jpg'
  },
  {
    name: 'gray wolf article should match gray wolf image',
    postTitle: 'Understanding Gray Wolves',
    expectedImageFilename: 'gray-wolf.jpg'
  },
  {
    name: 'remote work article should have no confident animal image match',
    postTitle: 'Best Practices for Remote Work',
    expectedImageFilename: null
  }
];

async function buildEvaluationDataset() {
  const dataset = [];

  for (const evaluationCase of EVALUATION_CASES) {
    const post = await Post.findOne({
      title: evaluationCase.postTitle
    });

    if (!post) {
      throw new Error(
        `Post not found: "${evaluationCase.postTitle}". Run npm run seed:posts first.`
      );
    }

    let expectedImageId = null;

    if (evaluationCase.expectedImageFilename) {
      const image = await Image.findOne({
        originalFilename: evaluationCase.expectedImageFilename
      });

      if (!image) {
        throw new Error(
          `Image not found: "${evaluationCase.expectedImageFilename}". Run npm run seed:images first.`
        );
      }

      if (image.processingStatus !== 'completed') {
        throw new Error(
          `Image "${evaluationCase.expectedImageFilename}" is not completed. Current status: ${image.processingStatus}`
        );
      }

      if (!Array.isArray(image.embedding) || image.embedding.length === 0) {
        throw new Error(
          `Image "${evaluationCase.expectedImageFilename}" does not have an embedding.`
        );
      }

      expectedImageId = image._id.toString();
    }

    dataset.push({
      name: evaluationCase.name,
      postId: post._id.toString(),
      expectedImageId
    });
  }

  return dataset;
}

async function main() {
  try {
    await connectDB();

    const dataset = await buildEvaluationDataset();

    fs.writeFileSync(
      DATASET_PATH,
      `${JSON.stringify(dataset, null, 2)}\n`,
      'utf8'
    );

    console.log(
      `\nEvaluation dataset written to:\n${DATASET_PATH}\n`
    );

    console.table(dataset);
  } catch (error) {
    logger.error('seed_evaluation_failed', {
      message: error.message
    });

    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

main();