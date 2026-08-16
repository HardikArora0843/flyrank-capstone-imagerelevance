# Evidence

This file records verified proof for the FlyRank AI Capstone 3 requirements.

Evidence is only marked as `PASS` when an actual command, automated test, or reproducible live request provides proof.

---

## 1. Health Check

### Requirement

`GET /health` must return:

```json
{
  "status": "ok"
}
```

### Verification

Command:

```bash
npm test
```

Live request:

```powershell
Invoke-RestMethod -Uri http://localhost:5000/health
```

### Result

Automated health test passed.

Live API returned:

```json
{
  "status": "ok"
}
```

### Status

**PASS**

---

## 2. Base Validation Middleware

### Requirement

API validation must reject malformed request data and provide a consistent validation error response.

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/middleware/validation.test.js
```

### Result

Validation middleware tests passed.

Invalid API payloads return:

```json
{
  "error": {
    "message": "Invalid request payload"
  }
}
```

### Status

**PASS**

---

## 3. MongoDB Models and Indexes

### Requirement

The system must provide MongoDB/Mongoose models for:

- Image
- Post
- Suggestion
- Review
- Job
- AIUsage

Required indexes must also be defined.

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/models/indexes.test.js
```

### Result

The model/index test passed.

The project contains Mongoose models for all required collections.

MongoDB connectivity was subsequently verified during evaluation dataset generation.

### Status

**PASS**

---

## 4. MongoDB Connectivity

### Requirement

The application must be able to connect to MongoDB and persist application data.

### Verification

Command:

```bash
npm run seed:evaluation
```

### Actual result

The application successfully connected to MongoDB:

```text
mongodb_connected
database: test
```

The evaluation dataset was successfully generated from persisted Post and Image records.

### Result

MongoDB connectivity was successfully verified.

### Status

**PASS**

---

## 5. MongoDB Migration and Index Setup

### Requirement

The project must provide a reproducible migration/index initialization command.

### Command

```bash
npm run migrate
```

The migration script uses Mongoose `syncIndexes()` for the application models.

### Implementation

Migration is implemented in:

```text
scripts/migration.js
```

### Status

**IMPLEMENTED**

MongoDB connectivity is now live-verified through the evaluation workflow.

---

## 6. Image Ingestion API

### Requirement

`POST /api/images` must:

1. Accept an image upload.
2. Validate the uploaded file.
3. Upload the image through Cloudinary.
4. Create an Image record.
5. Return image processing information.
6. Reject invalid uploads.

### Endpoint

```http
POST /api/images
Content-Type: multipart/form-data
Field: image
```

### Verification

Automated tests:

```bash
npm test
```

Relevant test:

```text
tests/api/images.test.js
```

### Live validation

An invalid upload request was tested against the running server.

Result:

```json
{
  "error": {
    "message": "Image file is required"
  }
}
```

### Status

**PASS for API validation and application behavior**

Real Cloudinary upload was not independently verified as a dedicated final test.

---

## 7. Cloudinary Configuration

### Requirement

Cloudinary credentials must be loaded from environment variables and must not be hard-coded.

### Environment variables

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Implementation

Cloudinary configuration:

```text
src/config/cloudinary.js
```

Cloudinary service:

```text
src/services/cloudinaryService.js
```

### Verification

Code inspection and automated tests confirm that credentials are read from environment configuration.

### Status

**IMPLEMENTED**

Dedicated live Cloudinary upload verification remains separate.

---

## 8. Gemini Vision Metadata Schema

### Requirement

Gemini Vision output must be strictly validated before being trusted.

The system must reject:

- malformed JSON
- invalid confidence values
- invalid metadata
- unexpected fields

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/schemas/imageMetadataSchema.test.js
```

### Result

The image metadata schema tests passed.

### Status

**PASS**

---

## 9. Gemini Vision Service

### Requirement

The Gemini Vision integration must:

- be isolated in a dedicated service
- request structured output
- parse model output
- validate output with Zod
- retry malformed responses
- fail safely after retry exhaustion
- flag low-confidence results

### Implementation

```text
src/services/visionService.js
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/visionService.test.js
tests/services/imageProcessingService.test.js
tests/schemas/imageMetadataSchema.test.js
```

### Result

Tests verify:

- valid Gemini output
- malformed JSON
- markdown-fenced output
- schema validation
- invalid confidence
- retry behavior
- retry exhaustion
- low-confidence flagging
- processing idempotency

### Status

**PASS for deterministic service behavior**

A dedicated live Gemini Vision API request was not independently recorded as final evidence.

---

## 10. Low-Confidence Image Handling

### Requirement

Low-confidence image metadata must not automatically become a completed image.

### Implementation

The configured confidence threshold is:

```env
VISION_CONFIDENCE_THRESHOLD=0.70
```

Low-confidence valid metadata is marked:

```text
flagged
```

instead of:

```text
completed
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/visionService.test.js
tests/services/imageProcessingService.test.js
```

### Status

**PASS**

---

## 11. Inngest Asynchronous Processing

### Requirement

Image processing must be asynchronous and supported by Inngest.

The system must provide:

- single-image processing
- batch processing
- job tracking
- deterministic job IDs
- retry/failure tracking
- job status APIs

### Implementation

Inngest functions:

```text
src/jobs/processImage.js
src/jobs/processImageBatch.js
```

Job service:

```text
src/services/jobService.js
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/jobService.test.js
tests/api/jobs.test.js
```

### Result

Tests verify:

- job creation
- deterministic job IDs
- event enqueueing
- job progress
- failure handling
- completion behavior
- API validation

### Status

**PASS for local application behavior**

External Inngest execution was not independently verified.

---

## 12. Deterministic Image Processing Job IDs

### Requirement

Repeated processing requests for the same image must not create duplicate job records.

### Implementation

Single-image jobs use:

```text
process_image:<imageId>
```

### Result

The deterministic job ID provides record-level idempotency.

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/services/jobService.test.js
```

### Status

**PASS**

---

## 13. AI Usage and Cost Tracking

### Requirement

Gemini operations must record:

- provider
- model
- operation
- image/post reference
- input tokens
- output tokens
- total tokens
- estimated cost

### Implementation

Model:

```text
src/models/AIUsage.js
```

Service:

```text
src/services/costTrackingService.js
```

API:

```text
GET /api/usage
GET /api/usage/summary
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/costTrackingService.test.js
tests/services/visionUsage.test.js
tests/api/usage.test.js
```

### Result

Usage extraction, recording, summary calculation, and API validation all passed.

### Status

**PASS**

---

## 14. Usage API Validation

### Requirement

Invalid usage query parameters must be rejected.

### Live request

```powershell
Invoke-WebRequest `
    -Uri "http://localhost:5000/api/usage?operation=unknown" `
    -SkipHttpErrorCheck
```

### Expected response

```json
{
  "error": {
    "message": "Invalid request payload"
  }
}
```

### Status

**PASS**

---

## 15. Post API

### Requirement

The system must provide CRUD operations for posts.

### Endpoints

```http
POST /api/posts
GET /api/posts
GET /api/posts/:id
PATCH /api/posts/:id
DELETE /api/posts/:id
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/api/posts.test.js
tests/services/postService.test.js
```

### Result

Post creation, listing, retrieval, update, and validation behavior passed automated tests.

### Status

**PASS**

---

## 16. Article Analysis

### Requirement

Post title/content must be analyzed into structured metadata:

- subject
- category
- keywords

The AI output must be strictly validated.

### Implementation

```text
src/services/articleAnalysisService.js
src/schemas/articleMetadataSchema.js
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/articleAnalysisService.test.js
tests/schemas/articleMetadataSchema.test.js
tests/services/postService.test.js
tests/api/posts.test.js
```

### Result

Tests verify:

- structured output
- schema validation
- malformed output
- retry behavior
- safe failure
- post persistence behavior

### Status

**PASS for deterministic service/API behavior**

Dedicated live Gemini article-analysis verification was not independently recorded.

---

## 17. Embeddings

### Requirement

The system must generate semantic embeddings for images and posts.

### Image embedding inputs

```text
caption
subject
category
attributes
```

### Post embedding inputs

```text
title
content
subject
category
keywords
```

### Implementation

```text
src/services/embeddingService.js
```

### Storage

Embeddings are stored directly as numeric arrays in MongoDB.

No separate vector database is used.

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/services/embeddingService.test.js
tests/services/imageProcessingService.test.js
tests/services/postService.test.js
```

### Result

Tests verify:

- embedding request construction
- embedding response parsing
- usage tracking
- persistence assignment

Persisted image embeddings were subsequently used successfully during live evaluation.

### Status

**PASS for implementation and evaluation-backed persistence**

A dedicated live Gemini embedding API request was not independently recorded.

---

## 18. Cosine Similarity

### Requirement

The system must calculate cosine similarity between image and post embeddings.

The implementation must:

- validate arrays
- validate numeric values
- validate vector dimensions
- handle zero vectors safely
- return a numeric similarity

### Implementation

```text
src/utils/cosineSimilarity.js
```

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/utils/cosineSimilarity.test.js
```

### Status

**PASS**

---

## 19. Matching Engine

### Requirement

The matching engine must:

1. Load a post.
2. Ensure the post has an embedding.
3. Load completed image candidates.
4. Calculate cosine similarity.
5. Rank candidates.
6. Apply the mismatch guard.
7. Persist suggestions.
8. Return accepted candidates.
9. Return `no_confident_match` if no candidate passes.

### Implementation

```text
src/services/matchingService.js
```

### Endpoint

```http
GET /api/posts/:id/images
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/matching/matchingService.test.js
tests/api/matching.test.js
```

### Status

**PASS**

---

## 20. Mismatch Guard

### Requirement

Similarity alone must not determine whether an image is safe to recommend.

The guard checks:

- similarity
- image confidence
- subject compatibility
- category compatibility

### Implementation

```text
src/services/mismatchGuardService.js
```

### Verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/guard/mismatchGuardService.test.js
```

### Tested scenarios

- red fox accepted
- gray wolf rejected for red fox
- low similarity rejected
- low confidence rejected
- category mismatch rejected
- forced incorrect candidate rejected
- no candidates handled safely

### Status

**PASS**

---

## 21. Red Fox / Gray Wolf Safety Test

### Requirement

A red fox article must not recommend a gray wolf merely because the embedding similarity is relatively high.

### Live suggestion example

For the red fox article, the gray wolf candidate produced:

```text
Similarity: 0.3358349472638014
```

The guard returned:

```text
guardStatus: rejected
```

Reasons included:

```text
Similarity 0.336 is below threshold 0.4
Subject mismatch: expected red fox, detected gray wolf
```

### Status

**PASS**

---

## 22. No-Confident-Match Behavior

### Requirement

When no candidate passes the guard, the system must return:

```text
no_confident_match
```

instead of recommending an unsafe image.

### Live evaluation

The remote-work article produced:

```text
Status: no_confident_match
Actual top-1: none
Result: CORRECT
```

### Status

**PASS**

---

## 23. Suggestion Persistence

### Requirement

Matching decisions must be persisted as Suggestion records.

Suggestion records contain:

- post ID
- image ID
- similarity score
- guard status
- guard reasons
- decision
- decision reason

### Implementation

```text
src/models/Suggestion.js
src/services/matchingService.js
```

### Verification

Live evaluation and review workflow successfully operated on persisted suggestions.

### Status

**PASS**

---

## 24. Review API

### Requirement

Human reviewers must be able to:

- inspect suggestions
- approve suggestions
- reject suggestions
- create review records
- list review history

### Endpoints

```http
GET /api/suggestions/:id
GET /api/suggestions/:id/reviews
POST /api/suggestions/:id/reviews
POST /api/suggestions/:id/approve
POST /api/suggestions/:id/reject
```

### Verification

Command:

```bash
npm test
```

Relevant tests:

```text
tests/api/reviews.test.js
tests/services/reviewService.test.js
```

### Result

All review API tests passed.

### Status

**PASS**

---

## 25. Live Review Approval

### Requirement

A human reviewer must be able to approve a suggestion and update its current decision.

### Request

```powershell
$body = @{
    decision = "approved"
    reason   = "Generic review confirms that the image is relevant to the red fox article"
    reviewer = "human-reviewer"
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/suggestions/6a8107615cc8b93fcdb70174/reviews" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Verified result

The suggestion was updated to:

```text
decision: approved
```

The review record was persisted.

### Review history

```json
{
  "decision": "approved",
  "reason": "Generic review confirms that the image is relevant to the red fox article",
  "reviewer": "human-reviewer"
}
```

### Status

**PASS**

---

## 26. Live Review Rejection

### Requirement

A human reviewer must be able to reject a suggestion and update its current decision.

### Request

```powershell
$body = @{
    reason   = "Image does not match the red fox article because it shows a gray wolf"
    reviewer = "human-reviewer"
} | ConvertTo-Json -Compress

Invoke-RestMethod `
    -Uri "http://localhost:5000/api/suggestions/6a8107615cc8b93fcdb70175/reject" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Verified result

The suggestion was updated to:

```text
guardStatus: rejected
decision: manually_rejected
```

The review record was persisted with:

```text
decision: rejected
reviewer: human-reviewer
```

### Status

**PASS**

---

## 27. Review History

### Requirement

Review history must be retrievable for a suggestion.

### Request

```powershell
curl.exe "http://localhost:5000/api/suggestions/6a8107615cc8b93fcdb70175/reviews"
```

### Result

The API returned the persisted review:

```json
{
  "decision": "rejected",
  "reason": "Image does not match the red fox article because it shows a gray wolf",
  "reviewer": "human-reviewer"
}
```

### Status

**PASS**

---

## 28. Invalid Review Payload

### Requirement

Invalid review payloads must be rejected with HTTP 400.

### Test

An invalid decision:

```text
something_invalid
```

was submitted.

### Result

The API returned:

```json
{
  "error": {
    "message": "Invalid request payload"
  }
}
```

A review with a missing reason was also rejected with the same validation response.

### Status

**PASS**

---

## 29. Invalid Suggestion ID Handling

### Requirement

Malformed suggestion IDs must not result in an internal server error.

### Earlier behavior

An invalid ID such as:

```text
not-a-valid-id
```

initially resulted in:

```text
500 Internal server error
```

### Correction

The review service was updated to validate MongoDB ObjectIds before querying MongoDB.

### Current behavior

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:5000/api/suggestions/not-a-valid-id/reviews" `
    -Method GET
```

returns:

```json
{
  "error": {
    "message": "Suggestion not found"
  }
}
```

HTTP status:

```text
404
```

### Status

**PASS**

---

## 30. Review Service Regression Tests

### Requirement

The review service must correctly handle:

- approval
- rejection
- review history
- missing suggestions
- invalid suggestion IDs

### Verification

Command:

```bash
npm test -- tests/services/reviewService.test.js
```

### Result

```text
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

Tests passed:

```text
maps approval to approved suggestion state
maps rejection to manually_rejected suggestion state
lists review history for a suggestion
throws NotFoundError for missing suggestions
throws NotFoundError for an invalid suggestion id
```

### Status

**PASS**

---

## 31. Full Automated Test Suite

### Requirement

The complete application test suite must pass before finalizing the implementation.

### Command

```bash
npm test
```

### Final result

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
Snapshots:   0 total
```

### Status

**PASS**

---

## 32. ESLint

### Requirement

The project must pass linting without ESLint errors.

### Command

```bash
npm run lint
```

### Result

The command completed successfully with exit code `0`.

### Status

**PASS**

---

## 33. Evaluation Dataset

### Requirement

The project must contain a labeled evaluation dataset for measuring matching quality.

### Files

```text
dataset/evaluation.json
dataset/README.md
dataset/images/red-fox.jpg
dataset/images/gray-wolf.jpg
dataset/images/dog.jpg
dataset/images/unrelated.jpg
```

### Dataset generation

Command:

```bash
npm run seed:evaluation
```

### Result

The dataset was successfully generated from persisted MongoDB records.

Three evaluation cases were created:

1. red fox article → red fox image
2. gray wolf article → gray wolf image
3. remote work article → no confident animal image

### Status

**PASS**

---

## 34. Live Evaluation

### Requirement

The evaluation must execute the actual matching engine against persisted data.

### Command

```bash
npm run evaluate
```

### Live result

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

### Case 1

```text
Name:
red fox article should match red fox image

Expected:
red fox image

Actual:
red fox image

Similarity:
0.4213

Result:
CORRECT
```

### Case 2

```text
Name:
gray wolf article should match gray wolf image

Expected:
gray wolf image

Actual:
gray wolf image

Similarity:
0.4264

Result:
CORRECT
```

### Case 3

```text
Name:
remote work article should have no confident animal image match

Expected:
none

Actual:
none

Status:
no_confident_match

Result:
CORRECT
```

### Final metric

```text
Top-1 precision: 100.00%
```

### Status

**PASS**

---

## 35. Evaluation Database Verification

### Requirement

The evaluation must operate against real persisted MongoDB data rather than only mocked services.

### Verification command

```bash
npm run seed:evaluation
```

### Result

MongoDB connection was established:

```text
mongodb_connected
database: test
```

The script successfully retrieved:

- persisted posts
- persisted images
- persisted image embeddings

and generated:

```text
dataset/evaluation.json
```

### Status

**PASS**

---

## 36. Documentation Verification

The project contains:

```text
README.md
BUILDLOG.md
EVIDENCE.md
docs/design.md
docs/architecture.md
docs/implementation-plan.md
dataset/README.md
capstone.yaml
```

These documents describe:

- architecture
- implementation phases
- API endpoints
- AI trust boundaries
- evaluation
- verification
- known limitations
- deployment direction

### Status

**PASS**

---

# Final Verification Summary

| Area | Status |
|---|---|
| Express application | PASS |
| Health endpoint | PASS |
| Validation middleware | PASS |
| MongoDB models | PASS |
| MongoDB connectivity | PASS |
| MongoDB indexes | PASS |
| Image API | PASS |
| Cloudinary integration | IMPLEMENTED |
| Gemini Vision service | PASS |
| Vision schema validation | PASS |
| Low-confidence handling | PASS |
| Inngest job architecture | PASS |
| AI usage tracking | PASS |
| Post CRUD | PASS |
| Article analysis | PASS |
| Embedding service | PASS |
| Cosine similarity | PASS |
| Matching engine | PASS |
| Mismatch guard | PASS |
| Fox/wolf safety behavior | PASS |
| No-confident-match behavior | PASS |
| Suggestion persistence | PASS |
| Review approval | LIVE VERIFIED |
| Review rejection | LIVE VERIFIED |
| Review history | LIVE VERIFIED |
| Invalid suggestion ID handling | PASS |
| Evaluation dataset | PASS |
| Live evaluation | PASS |
| Top-1 precision | 100.00% |
| Automated tests | 23/23 suites, 90/90 tests |
| ESLint | PASS |
| Documentation | PASS |
| Deployment | PENDING |

---

# Known Limitations

The following areas are implemented but were not independently verified as dedicated final external-service tests:

## Cloudinary

The Cloudinary integration is implemented, but a dedicated live upload verification was not recorded as final evidence.

## Gemini Vision

The Gemini Vision service is implemented and thoroughly tested with mocked responses, but a dedicated live Vision API request was not recorded as final evidence.

## Gemini Embeddings

Embedding generation and persistence are implemented and persisted embeddings were used successfully by the live evaluation. A dedicated live Gemini embedding API request was not separately recorded.

## Inngest

The Inngest integration, event handling, functions, and job logic are implemented and tested. External Inngest execution was not independently verified.

## Deployment

The application has not yet been deployed to a public production URL.

Deployment is only considered complete after a real deployed `/health` request succeeds.

---

# Final Evidence

The strongest current proof for the project is:

```text
Automated test suites: 23/23 PASS

Automated tests: 90/90 PASS

ESLint: PASS

MongoDB connectivity: LIVE VERIFIED

Evaluation dataset generation: PASS

Live matching evaluation: PASS

Evaluation cases: 3/3 correct

Top-1 precision: 100.00%

Human approval workflow: LIVE VERIFIED

Human rejection workflow: LIVE VERIFIED

Review history persistence: LIVE VERIFIED

Invalid suggestion ID handling: PASS
```

---

