const fs = require('fs');
const path = require('path');

const { connectDB, disconnectDB } = require('../src/config/db');
const matchingService = require('../src/services/matchingService');

const DATASET_PATH = path.join(__dirname, '..', 'dataset', 'evaluation.json');

function loadEvaluationDataset() {
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Evaluation dataset not found: ${DATASET_PATH}`);
  }

  const raw = fs.readFileSync(DATASET_PATH, 'utf8');

  let dataset;

  try {
    dataset = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Evaluation dataset contains invalid JSON: ${error.message}`);
  }

  if (!Array.isArray(dataset)) {
    throw new Error('Evaluation dataset must contain a JSON array.');
  }

  return dataset;
}

function validateEvaluationCase(testCase, index) {
  if (!testCase || typeof testCase !== 'object' || Array.isArray(testCase)) {
    throw new Error(
      `Evaluation case ${index + 1} must be a JSON object.`
    );
  }

  if (!testCase.name || typeof testCase.name !== 'string') {
    throw new Error(
      `Evaluation case ${index + 1} is missing a valid "name".`
    );
  }

  if (!testCase.postId || typeof testCase.postId !== 'string') {
    throw new Error(
      `Evaluation case "${testCase.name}" is missing a valid "postId".`
    );
  }

  if (
    testCase.expectedImageId !== null &&
    (typeof testCase.expectedImageId !== 'string' ||
      testCase.expectedImageId.trim() === '')
  ) {
    throw new Error(
      `Evaluation case "${testCase.name}" must have "expectedImageId" as a string or null.`
    );
  }
}

function getTop1Suggestion(result) {
  if (
    result &&
    result.status === 'matched' &&
    Array.isArray(result.suggestions) &&
    result.suggestions.length > 0
  ) {
    return result.suggestions[0];
  }

  return null;
}

async function evaluateCase(testCase) {
  const result = await matchingService.matchImagesForPost(testCase.postId);
  const top1Suggestion = getTop1Suggestion(result);

  const actualImageId = top1Suggestion?.imageId
    ? top1Suggestion.imageId.toString()
    : null;

  const expectedImageId = testCase.expectedImageId
    ? testCase.expectedImageId.toString()
    : null;

  const correct = actualImageId === expectedImageId;

  return {
    name: testCase.name,
    postId: testCase.postId,
    expectedImageId,
    actualImageId,
    status: result.status,
    correct,
    similarityScore: top1Suggestion?.similarityScore ?? null
  };
}

async function main() {
  let exitCode = 0;

  try {
    const dataset = loadEvaluationDataset();

    if (dataset.length === 0) {
      throw new Error(
        'Evaluation dataset is empty. Add real labeled cases to dataset/evaluation.json before running evaluation.'
      );
    }

    dataset.forEach(validateEvaluationCase);

    await connectDB();

    const results = [];

    for (const testCase of dataset) {
      try {
        const result = await evaluateCase(testCase);
        results.push(result);
      } catch (error) {
        results.push({
          name: testCase.name,
          postId: testCase.postId,
          expectedImageId: testCase.expectedImageId,
          actualImageId: null,
          status: 'evaluation_error',
          correct: false,
          similarityScore: null,
          error: error.message
        });
      }
    }

    const correctCount = results.filter((result) => result.correct).length;
    const evaluatedCount = results.length;
    const precision =
      evaluatedCount > 0 ? correctCount / evaluatedCount : 0;

    console.log('\nEvaluation Results\n');
    console.log('----------------------------------------');

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   Post ID: ${result.postId}`);
      console.log(`   Expected image: ${result.expectedImageId ?? 'none'}`);
      console.log(`   Actual top-1:   ${result.actualImageId ?? 'none'}`);
      console.log(`   Status:         ${result.status}`);
      console.log(`   Result:         ${result.correct ? 'CORRECT' : 'INCORRECT'}`);

      if (result.similarityScore !== null) {
        console.log(
          `   Similarity:     ${result.similarityScore.toFixed(4)}`
        );
      }

      if (result.error) {
        console.log(`   Error:          ${result.error}`);
      }

      console.log('----------------------------------------');
    });

    console.log('\nEvaluation complete\n');
    console.log(`Posts evaluated: ${evaluatedCount}`);
    console.log(`Correct top-1 matches: ${correctCount}`);
    console.log(
      `Top-1 precision: ${(precision * 100).toFixed(2)}%`
    );

    const incorrectResults = results.filter((result) => !result.correct);

    if (incorrectResults.length > 0) {
      console.log('\nIncorrect cases:');

      incorrectResults.forEach((result) => {
        console.log(`- ${result.name}`);

        if (result.error) {
          console.log(`  Error: ${result.error}`);
        } else {
          console.log(`  Expected: ${result.expectedImageId ?? 'none'}`);
          console.log(`  Actual:   ${result.actualImageId ?? 'none'}`);
        }
      });
    }

    console.log('');

    if (incorrectResults.length > 0) {
      exitCode = 1;
    }
  } catch (error) {
    console.error(`\nEvaluation failed: ${error.message}\n`);
    exitCode = 1;
  } finally {
    await disconnectDB();
  }

  process.exitCode = exitCode;
}

main();