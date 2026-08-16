const { ValidationError } = require('./errors');

function validateVector(vector, name) {
  if (!Array.isArray(vector)) {
    throw new ValidationError(`${name} must be an array`);
  }

  if (vector.length === 0) {
    throw new ValidationError(`${name} must not be empty`);
  }

  for (const value of vector) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError(`${name} must contain only numbers`);
    }
  }
}

function cosineSimilarity(vectorA, vectorB) {
  validateVector(vectorA, 'vectorA');
  validateVector(vectorB, 'vectorB');

  if (vectorA.length !== vectorB.length) {
    throw new ValidationError('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dotProduct += vectorA[index] * vectorB[index];
    magnitudeA += vectorA[index] * vectorA[index];
    magnitudeB += vectorB[index] * vectorB[index];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

module.exports = cosineSimilarity;
