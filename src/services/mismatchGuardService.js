const env = require('../config/env');

const GENERIC_SUBJECT_WORDS = new Set([
  'a',
  'an',
  'and',
  'animal',
  'animals',
  'bird',
  'birds',
  'canid',
  'canids',
  'creature',
  'image',
  'mammal',
  'mammals',
  'photo',
  'picture',
  'the',
  'wildlife'
]);

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularize(token) {
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith('es') && token.length > 3) {
    return token.slice(0, -2);
  }

  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function subjectTokens(subject) {
  return normalizeText(subject)
    .split(' ')
    .map(singularize)
    .filter((token) => token && !GENERIC_SUBJECT_WORDS.has(token));
}

function areSubjectsCompatible(expectedSubject, detectedSubject) {
  const expected = subjectTokens(expectedSubject);
  const detected = subjectTokens(detectedSubject);

  if (expected.length === 0 || detected.length === 0) {
    return false;
  }

  return expected.some((token) => detected.includes(token));
}

function areCategoriesCompatible(expectedCategory, detectedCategory) {
  const expected = normalizeText(expectedCategory);
  const detected = normalizeText(detectedCategory);

  if (!expected || !detected) {
    return false;
  }

  return expected === detected;
}

function evaluateCandidate({ post, image, similarityScore }, thresholds = {}) {
  const similarityThreshold =
    thresholds.similarityThreshold ?? env.similarityThreshold;
  const visionConfidenceThreshold =
    thresholds.visionConfidenceThreshold ?? env.visionConfidenceThreshold;
  const reasons = [];

  if (similarityScore < similarityThreshold) {
    reasons.push(
      `Similarity ${similarityScore.toFixed(3)} is below threshold ${similarityThreshold}`
    );
  }

  if ((image.confidence ?? 0) < visionConfidenceThreshold) {
    reasons.push(
      `Image confidence ${image.confidence ?? 0} is below threshold ${visionConfidenceThreshold}`
    );
  }

  if (!areSubjectsCompatible(post.subject, image.subject)) {
    reasons.push(
      `Subject mismatch: expected ${post.subject || 'unknown'}, detected ${image.subject || 'unknown'}`
    );
  }

  if (!areCategoriesCompatible(post.category, image.category)) {
    reasons.push(
      `Category mismatch: expected ${post.category || 'unknown'}, detected ${image.category || 'unknown'}`
    );
  }

  if (reasons.length > 0) {
    return {
      guardStatus: 'rejected',
      decision: 'rejected',
      reasons,
      decisionReason: reasons.join('; ')
    };
  }

  return {
    guardStatus: 'accepted',
    decision: 'recommended',
    reasons: ['Strong semantic similarity, subject match, category match, and sufficient image confidence'],
    decisionReason:
      'Strong semantic similarity, subject match, category match, and sufficient image confidence'
  };
}

module.exports = {
  areCategoriesCompatible,
  areSubjectsCompatible,
  evaluateCandidate,
  normalizeText,
  subjectTokens
};
