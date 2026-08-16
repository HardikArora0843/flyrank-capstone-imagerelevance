Next is **`docs/implementation-plan.md`**.

Complete file, **one copy-paste block**:

```markdown
# Implementation Plan

This document tracks the implementation roadmap for FlyRank AI Capstone 3: Image Relevance and Auto-Tagging.

The project is implemented incrementally. Each phase is considered complete only after the relevant implementation, tests, and verification steps are finished.

---

## Phase 1: Design and First Runnable Slice

**Status: Completed**

### Objectives

- Inspect workspace.
- Create project structure.
- Create design and architecture documentation.
- Add required project files.
- Initialize Node.js/Express project.
- Implement `GET /health`.
- Add automated test coverage.
- Run the application.
- Verify the health endpoint.

### Result

- Express backend initialized.
- Project documentation structure created.
- Health endpoint implemented.
- Jest/Supertest health test passed.
- Live `GET /health` returned:

```json
{
  "status": "ok"
}
```

---

## Phase 2: Project Hardening

**Status: Completed**

### Objectives

- Add base validation middleware.
- Add shared application error classes.
- Add environment configuration.
- Establish consistent API error handling.
- Document the initial architecture.

### Result

The project now contains:

- centralized environment configuration
- validation middleware
- reusable error classes
- centralized error handling
- structured project documentation

### Verification

- Validation middleware tests passed.
- API validation tests passed.
- ESLint passed.

---

## Phase 3: MongoDB Foundation

**Status: Completed**

### Objectives

- Add Mongoose connection.
- Add MongoDB models.
- Add required indexes.
- Add reproducible migration/index setup.
- Add database connection behavior.

### Models

The following models were implemented:

```text
Image
Post
Suggestion
Review
Job
AIUsage
```

### Result

- Mongoose connection helper implemented.
- All required models implemented.
- Required indexes implemented.
- `npm run migrate` implemented.
- Model/index tests passed.

### Live Verification

MongoDB connectivity was successfully verified during evaluation dataset generation.

Command:

```bash
npm run seed:evaluation
```

The application successfully connected to MongoDB and retrieved persisted Post and Image records.

### Status

**Complete**

---

## Phase 4: Cloudinary Image Storage

**Status: Completed locally; live upload independently unverified**

### Objectives

- Add Cloudinary configuration.
- Add Cloudinary upload service.
- Add Cloudinary delete service.
- Add image upload endpoint.
- Validate uploaded image MIME types.
- Persist Cloudinary metadata.

### Result

Implemented:

```text
src/config/cloudinary.js
src/services/cloudinaryService.js
src/services/imageService.js
src/controllers/imageController.js
src/routes/imageRoutes.js
src/middleware/upload.js
```

### Endpoint

```http
POST /api/images
```

### Behavior

The image ingestion flow is:

```text
Client
  ↓
Express
  ↓
Multer validation
  ↓
Cloudinary
  ↓
MongoDB Image record
  ↓
Processing job
```

### Verification

Automated image API tests passed.

Invalid live upload validation was also verified.

Example response:

```json
{
  "error": {
    "message": "Image file is required"
  }
}
```

### Remaining limitation

A dedicated real Cloudinary upload was not independently recorded as final evidence.

---

## Phase 5: Gemini Vision

**Status: Completed locally; live Gemini Vision independently unverified**

### Objectives

- Add Gemini configuration.
- Add image metadata schema.
- Add structured Gemini Vision requests.
- Parse JSON responses.
- Validate output with Zod.
- Implement retries.
- Handle low-confidence results safely.

### Result

Implemented:

```text
src/config/gemini.js
src/schemas/imageMetadataSchema.js
src/services/visionService.js
src/services/imageProcessingService.js
```

### Trust Boundary

Gemini output is treated as untrusted external data.

The processing pipeline is:

```text
Gemini response
      ↓
JSON extraction
      ↓
Zod validation
      ↓
Confidence validation
      ↓
Application state
```

### Low-Confidence Behavior

Low-confidence metadata is marked:

```text
flagged
```

instead of:

```text
completed
```

### Verification

Tests cover:

- valid responses
- malformed JSON
- markdown fences
- invalid schema output
- invalid confidence
- retry behavior
- retry exhaustion
- low-confidence handling
- processing idempotency

### Status

**Complete for deterministic implementation and tests**

---

## Phase 6: Inngest Jobs and Asynchronous Processing

**Status: Completed locally; external execution independently unverified**

### Objectives

- Add Inngest configuration.
- Add image processing events.
- Add single-image processing function.
- Add batch processing function.
- Add job tracking.
- Add progress tracking.
- Add failure handling.
- Add idempotent job creation.

### Result

Implemented:

```text
src/config/inngest.js
src/jobs/processImage.js
src/jobs/processImageBatch.js
src/services/jobService.js
src/controllers/jobController.js
src/routes/jobRoutes.js
```

### Deterministic Job ID

Single-image processing uses:

```text
process_image:<imageId>
```

This prevents duplicate job records for repeated enqueue requests.

### Job States

```text
pending
processing
completed
completed_with_errors
failed
```

### Verification

Tests verify:

- job creation
- event enqueueing
- deterministic IDs
- progress updates
- failure handling
- completion behavior
- API validation

### Remaining limitation

External Inngest execution was not independently verified.

---

## Phase 7: AI Usage and Cost Tracking

**Status: Completed**

### Objectives

- Track Gemini Vision operations.
- Track embedding operations.
- Extract token usage.
- Calculate estimated cost.
- Persist AI usage records.
- Provide usage APIs.

### Result

Implemented:

```text
src/models/AIUsage.js
src/services/costTrackingService.js
src/controllers/usageController.js
src/routes/usageRoutes.js
```

### Stored Information

AI usage records can contain:

```text
provider
model
operation
imageId
postId
inputTokens
outputTokens
totalTokens
estimatedCost
```

### Important Design Decision

Usage persistence must never break the primary AI operation.

If usage recording fails, the AI request should not be unnecessarily retried only because the audit write failed.

### Verification

Tests passed for:

- usage extraction
- usage record creation
- cost calculation
- usage summaries
- usage API validation
- Vision usage integration

### Status

**Complete**

---

## Phase 8: Posts and Article Analysis

**Status: Completed locally; live Gemini article analysis independently unverified**

### Objectives

- Add Post CRUD.
- Analyze article title/content.
- Extract structured article metadata.
- Validate AI-generated metadata.
- Generate post embeddings.

### Article Metadata

The system extracts:

```text
subject
category
keywords
```

### Result

Implemented:

```text
src/models/Post.js
src/services/postService.js
src/services/articleAnalysisService.js
src/schemas/articleMetadataSchema.js
src/controllers/postController.js
src/routes/postRoutes.js
```

### Post Endpoints

```http
POST /api/posts
GET /api/posts
GET /api/posts/:id
PATCH /api/posts/:id
DELETE /api/posts/:id
```

### Verification

Tests passed for:

- article schema
- article analysis
- malformed AI output
- retry behavior
- safe failure
- Post CRUD
- API validation

### Remaining limitation

A dedicated live Gemini article-analysis request was not independently recorded.

---

## Phase 9: Embeddings and Similarity

**Status: Completed locally; live Gemini generation independently unverified**

### Objectives

- Generate image embeddings.
- Generate post embeddings.
- Store embeddings in MongoDB.
- Implement cosine similarity.
- Add vector validation.
- Add embedding usage tracking.

### Image Embedding Input

Images are embedded from:

```text
caption
subject
category
attributes
```

### Post Embedding Input

Posts are embedded from:

```text
title
content
subject
category
keywords
```

### Result

Implemented:

```text
src/services/embeddingService.js
src/utils/cosineSimilarity.js
```

Embeddings are stored directly in MongoDB as numeric arrays.

### Vector Database Decision

A separate vector database was intentionally not used.

The expected capstone scale is small enough for backend cosine similarity over MongoDB-stored vectors.

### Verification

Tests passed for:

- embedding request construction
- response parsing
- embedding persistence
- usage tracking
- vector validation
- dimension validation
- zero-vector handling
- cosine similarity

### Live Evaluation

Persisted image embeddings were successfully used by the live matching evaluation.

### Status

**Complete**

---

## Phase 10: Matching Engine and Mismatch Guard

**Status: Completed and live-verified**

### Objectives

- Load post embeddings.
- Load completed image candidates.
- Calculate cosine similarity.
- Rank candidates.
- Apply mismatch guard.
- Persist suggestions.
- Return safe recommendations.
- Return `no_confident_match` when appropriate.

### Matching Flow

```text
Post
 ↓
Post embedding
 ↓
Completed image candidates
 ↓
Cosine similarity
 ↓
Candidate ranking
 ↓
Mismatch guard
 ↓
Accept / Reject
 ↓
Suggestion persistence
 ↓
API response
```

### Guard Checks

The mismatch guard checks:

```text
similarity threshold
vision confidence
subject compatibility
category compatibility
```

### Important Safety Decision

The highest similarity image is not automatically accepted.

A candidate must pass the guard.

### Result

Implemented:

```text
src/services/matchingService.js
src/services/mismatchGuardService.js
src/controllers/matchingController.js
src/routes/matchingRoutes.js
```

### Endpoint

```http
GET /api/posts/:id/images
```

### Tested Scenarios

- red fox → red fox accepted
- red fox → gray wolf rejected
- low similarity rejected
- low confidence rejected
- category mismatch rejected
- forced incorrect candidate rejected
- no candidate available
- no candidate passing the guard

### Live Evaluation

The live evaluation successfully verified:

```text
red fox article → red fox image
gray wolf article → gray wolf image
remote work article → no_confident_match
```

### Result

```text
3/3 correct
100.00% Top-1 precision
```

### Status

**Complete**

---

## Phase 11: Human Review API

**Status: Completed and live-verified**

### Objectives

- Inspect suggestions.
- Approve suggestions.
- Reject suggestions.
- Store review records.
- Retrieve review history.
- Handle invalid suggestion IDs safely.

### Endpoints

```http
GET /api/suggestions/:id
GET /api/suggestions/:id/reviews
POST /api/suggestions/:id/reviews
POST /api/suggestions/:id/approve
POST /api/suggestions/:id/reject
```

### Review Decisions

Human approval produces:

```text
approved
```

Human rejection produces:

```text
manually_rejected
```

### Review History

Review records are append-only.

The Suggestion stores the latest decision while Review records preserve historical decisions.

### Important Bug Found

An invalid MongoDB ObjectId initially caused:

```text
500 Internal server error
```

### Correction

The review service was updated to validate the suggestion ID before calling MongoDB.

Invalid IDs now produce:

```text
404 Suggestion not found
```

### Verification

The review service test suite passed:

```text
5 tests passed
```

The complete test suite later passed:

```text
23 suites
90 tests
```

### Live Verification

Successfully verified:

- suggestion retrieval
- approval persistence
- rejection persistence
- review history
- invalid suggestion ID handling

### Status

**Complete**

---

## Phase 12: Evaluation

**Status: Completed**

### Objectives

- Create evaluation dataset.
- Generate dataset from persisted database records.
- Execute real matching logic.
- Measure Top-1 precision.
- Verify no-confident-match behavior.

### Files

```text
dataset/evaluation.json
dataset/README.md
dataset/images/red-fox.jpg
dataset/images/gray-wolf.jpg
dataset/images/dog.jpg
dataset/images/unrelated.jpg
```

### Dataset Generation

Command:

```bash
npm run seed:evaluation
```

### Generated Cases

```text
1. red fox article should match red fox image
2. gray wolf article should match gray wolf image
3. remote work article should have no confident animal image match
```

### Evaluation

Command:

```bash
npm run evaluate
```

### Result

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

### Individual Results

#### Case 1

```text
Expected:
red fox image

Actual:
red fox image

Similarity:
0.4213

Result:
CORRECT
```

#### Case 2

```text
Expected:
gray wolf image

Actual:
gray wolf image

Similarity:
0.4264

Result:
CORRECT
```

#### Case 3

```text
Expected:
none

Actual:
none

Status:
no_confident_match

Result:
CORRECT
```

### Status

**Complete**

---

## Phase 13: Documentation and Evidence

**Status: Completed**

### Objectives

- Complete README.
- Update build log.
- Update evidence document.
- Update implementation plan.
- Update architecture documentation.
- Update design documentation.
- Update dataset documentation.
- Update capstone command configuration.
- Ensure live and local verification are clearly distinguished.

### Documentation Files

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

### Final Automated Verification

Command:

```bash
npm test
```

Result:

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
```

### Lint

Command:

```bash
npm run lint
```

Result:

```text
PASS
```

### Status

**Complete**

---

## Phase 14: Deployment

**Status: Pending**

### Objectives

- Prepare deployment configuration.
- Configure production environment variables.
- Deploy backend to a Node.js-compatible hosting platform.
- Configure MongoDB Atlas.
- Configure Cloudinary.
- Configure Gemini.
- Configure Inngest.
- Verify deployed health endpoint.
- Document deployment steps.

### Potential Hosting Options

The project can be deployed to a Node.js-compatible platform such as:

```text
Render
Railway
Fly.io
```

The final platform should be selected based on the available free-tier requirements and ease of configuration.

### Required Production Environment Variables

```env
MONGODB_URI=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

GEMINI_API_KEY=
GEMINI_VISION_MODEL=
GEMINI_TEXT_MODEL=
GEMINI_EMBEDDING_MODEL=
GEMINI_API_BASE_URL=

VISION_MAX_ATTEMPTS=
ARTICLE_ANALYSIS_MAX_ATTEMPTS=
VISION_CONFIDENCE_THRESHOLD=

GEMINI_VISION_INPUT_COST_PER_1K=
GEMINI_VISION_OUTPUT_COST_PER_1K=
GEMINI_EMBEDDING_COST_PER_1K=

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Deployment Verification

Deployment will only be considered successful after a real request to:

```http
GET /health
```

returns:

```json
{
  "status": "ok"
}
```

### Current Status

**PENDING**

---

# Final Project State

The implementation phases through documentation are complete.

```text
Phase 1   Design and initialization       COMPLETE
Phase 2   Project hardening               COMPLETE
Phase 3   MongoDB                         COMPLETE
Phase 4   Cloudinary                      COMPLETE LOCALLY
Phase 5   Gemini Vision                   COMPLETE LOCALLY
Phase 6   Inngest                         COMPLETE LOCALLY
Phase 7   AI usage tracking               COMPLETE
Phase 8   Posts and article analysis      COMPLETE LOCALLY
Phase 9   Embeddings and similarity       COMPLETE
Phase 10  Matching and mismatch guard     COMPLETE + LIVE VERIFIED
Phase 11  Review API                      COMPLETE + LIVE VERIFIED
Phase 12  Evaluation                      COMPLETE + LIVE VERIFIED
Phase 13  Documentation                   COMPLETE
Phase 14  Deployment                      PENDING
```

---

# Final Verification Metrics

```text
Automated test suites: 23
Automated tests:       90
Tests passed:          90
Tests failed:          0

ESLint:                PASS

Evaluation cases:     3
Correct cases:        3
Incorrect cases:      0

Top-1 precision:      100.00%

MongoDB connectivity: LIVE VERIFIED

Review approval:      LIVE VERIFIED
Review rejection:     LIVE VERIFIED
Review history:       LIVE VERIFIED

Deployment:           PENDING
```

---

# Engineering Principles Established

The implementation follows these principles:

## 1. AI output is untrusted

Gemini responses must pass strict parsing and schema validation before being persisted.

## 2. Similarity is not enough

Semantic similarity is used for ranking, but safety rules determine whether a candidate can actually be recommended.

## 3. Safe rejection is better than guessing

The system can return:

```text
no_confident_match
```

when no image satisfies the guard.

## 4. Human review is auditable

Human decisions are stored as Review records while the Suggestion stores the current decision.

## 5. External integrations are isolated

Cloudinary, Gemini, MongoDB, and Inngest are kept behind dedicated configuration and service layers.

## 6. Verification must match the claim

Mocked tests are used to verify deterministic logic.

Live requests are used when proving actual external-service behavior.

Documentation explicitly distinguishes the two.

## 7. Build incrementally

Each phase was implemented, tested, and verified before moving to the next major subsystem.
```