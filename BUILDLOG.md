# Build Log

This file records the implementation history, verification results, mistakes, corrections, engineering decisions, and lessons learned during development of FlyRank AI Capstone 3.

The project is an image relevance and auto-tagging backend that uses:

- Express
- MongoDB / Mongoose
- Cloudinary
- Gemini Vision
- Gemini Embeddings
- Inngest
- Zod
- Jest / Supertest

The core objective is to recommend semantically relevant images for articles while preventing unsafe recommendations through deterministic mismatch guards and human review.

---

# 2026-08-15

## Phase 1 — Design and Project Initialization

### What was built

- Inspected the workspace.
- Created the backend project skeleton.
- Added an Express application.
- Added `GET /health`.
- Added project metadata.
- Added documentation placeholders.
- Installed Node dependencies.
- Added Jest and Supertest.
- Added automated health-check tests.
- Verified the health endpoint with a live HTTP request.

### Where AI helped

AI was used to:

- generate the initial backend structure
- translate the capstone requirements into a runnable Express backend
- create the initial documentation structure
- establish the initial testing strategy

### Where AI was wrong

No significant error was recorded during this phase.

### What was manually corrected

The npm scripts were updated to call local package entrypoints through `node`.

This was necessary because the Windows workspace path contains spaces and `&`, which caused problems with npm command shims.

### Important decisions

The initial architecture was intentionally kept backend-only.

The selected technology stack was:

```text
Express
MongoDB
Cloudinary
Gemini
Inngest
Zod
Jest
Supertest
```

The project was designed around isolated services rather than placing all business logic directly inside controllers.

### Verification

Automated health tests passed.

Live request:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

Returned:

```json
{
  "status": "ok"
}
```

### Local environment issue

The plain `npm` command initially pointed to a missing user-profile npm installation.

The bundled npm CLI under:

```text
C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js
```

was used successfully.

---

# 2026-08-15

## Phase 2 — Project Hardening and MongoDB Foundation

### What was built

- Added centralized environment configuration.
- Added reusable application error classes.
- Added validation middleware.
- Added MongoDB connection helper.
- Added Mongoose models:
  - Image
  - Post
  - Suggestion
  - Review
  - Job
  - AIUsage
- Added required indexes.
- Added `npm run migrate`.
- Added model tests.
- Added validation tests.

### Where AI helped

AI translated the persistence requirements into:

- Mongoose schemas
- model relationships
- indexes
- deterministic tests

### Where AI was wrong

No major error was recorded in this phase.

### What was manually corrected

No major manual correction was required.

### Important decisions

MongoDB indexes are managed through:

```text
syncIndexes()
```

The project deliberately separates:

```text
schema definition
```

from:

```text
index verification
```

MongoDB was not considered live-verified until an actual database connection succeeded.

### Verification

The model/index test passed.

Validation tests passed.

Lint passed.

### Later live verification

MongoDB connectivity was subsequently verified through the real application and evaluation workflow.

---

# 2026-08-15

## Phase 3 — Cloudinary and Image Ingestion

### What was built

- Added Cloudinary configuration.
- Added Cloudinary upload/delete service.
- Added Multer memory-upload middleware.
- Added image MIME validation.
- Added image service for:
  - upload
  - list
  - get
  - delete
- Added image controller.
- Added `/api/images` routes.
- Added image API tests.

### Architecture

The image ingestion flow became:

```text
Multipart Upload
      ↓
Multer
      ↓
File Validation
      ↓
Cloudinary
      ↓
MongoDB Image Record
```

Image binaries are not stored directly in MongoDB.

MongoDB stores:

```text
cloudinaryUrl
cloudinaryPublicId
originalFilename
processingStatus
```

### Where AI helped

AI connected the image ingestion flow from:

```text
HTTP upload
```

to:

```text
Cloudinary
```

and then:

```text
MongoDB
```

### Where AI was wrong

No significant architectural error was recorded in this phase.

### What was manually corrected

ESLint detected `Buffer` usage in tests.

The Node environment was configured appropriately so that `Buffer` was recognized.

Logger noise was also reduced during tests so expected API errors remained readable.

### Automated verification

Command:

```bash
npm test
```

Relevant test:

```text
tests/api/images.test.js
```

### Invalid upload verification

A live invalid upload request returned:

```json
{
  "error": {
    "message": "Image file is required"
  }
}
```

### Cloudinary live verification

A dedicated Cloudinary configuration test was executed.

The environment reported:

```text
Cloud name: SET
API key: SET
API secret: SET
```

Cloudinary responded:

```text
Cloudinary ping successful:
{
  status: 'ok',
  rate_limit_allowed: 500,
  rate_limit_remaining: 499
}
```

### Real upload verification

A real `red-fox.jpg` image was uploaded through the application.

The resulting Image record contained:

```text
originalFilename: red-fox.jpg
processingStatus: completed
cloudinaryUrl: https://res.cloudinary.com/...
cloudinaryPublicId: flyrank-capstone-image-relevance/file_wdh8xe
```

### Lesson

External services should be tested separately from mocked unit tests.

This phase established the difference between:

```text
configuration verified
```

and:

```text
real external service verified
```

---

# 2026-08-15

## Phase 4 — Gemini Vision

### What was built

- Added Gemini configuration.
- Added strict image metadata Zod schema.
- Added Gemini Vision service.
- Added JSON extraction.
- Added markdown-fence cleanup.
- Added strict schema validation.
- Added retry handling.
- Added low-confidence detection.
- Added image processing service.
- Added idempotency behavior for completed images.

### Trust boundary

Gemini output is treated as untrusted input.

The processing pipeline is:

```text
Gemini
   ↓
JSON extraction
   ↓
Schema validation
   ↓
Confidence check
   ↓
Business rules
   ↓
Persistence
```

The model output is never directly trusted.

### Where AI helped

AI helped encapsulate Gemini output handling behind a strict trust boundary.

Automated tests were created for:

- valid output
- malformed JSON
- markdown-fenced output
- invalid schema
- invalid confidence
- retries
- retry exhaustion
- low-confidence results

### Where AI was wrong

The initial Gemini configuration relied only on the already-loaded environment object.

This made test-time environment overrides difficult.

### What was manually corrected

Gemini configuration was changed to read current `process.env` values when creating request configuration.

`fetch` was also added to the ESLint globals for Node.js 22.

### Important decisions

The system does not allow raw Gemini output to directly modify application state.

The trust boundary is:

```text
AI
 ↓
Parse
 ↓
Validate
 ↓
Confidence
 ↓
Business Logic
 ↓
Persistence
```

### Automated verification

Relevant tests:

```text
tests/services/visionService.test.js
tests/services/imageProcessingService.test.js
tests/schemas/imageMetadataSchema.test.js
```

All passed.

### Gemini connectivity verification

A direct Gemini connectivity test was executed:

```bash
node .\test-gemini.js
```

The API returned:

```text
HTTP status: 200
Gemini connection successful
```

The tested model was:

```text
gemini-3.6-flash
```

### Live Gemini Vision verification

A direct Vision test was executed:

```bash
node .\test-gemini-vision.js
```

The test:

1. connected to MongoDB
2. found `red-fox.jpg`
3. retrieved its Cloudinary URL
4. downloaded the image
5. converted it to Base64
6. sent the image to Gemini
7. requested structured JSON
8. received a successful response

Cloudinary returned:

```text
HTTP status: 200
Content-Type: image/jpeg
Image size: 616326 bytes
```

Gemini returned:

```text
HTTP status: 200
```

with:

```json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": [
    "red fur",
    "white chest",
    "bushy tail",
    "pointed ears",
    "standing in grass"
  ],
  "caption": "A red fox stands alert amidst grass and fallen autumn leaves.",
  "confidence": 0.98
}
```

### Lesson

This provided the first direct proof that the real Gemini Vision integration worked with a real image rather than only mocked responses.

---

# 2026-08-15

## Phase 5 — Low-Confidence Handling

### What was built

The system was designed to prevent uncertain Gemini results from automatically becoming trusted image metadata.

Configuration:

```env
VISION_CONFIDENCE_THRESHOLD=0.70
```

### Behavior

If valid Gemini metadata has confidence below the configured threshold:

```text
processingStatus = flagged
```

instead of:

```text
processingStatus = completed
```

### Verification

Relevant tests:

```text
tests/services/visionService.test.js
tests/services/imageProcessingService.test.js
```

All passed.

### Important decision

Low confidence is treated as a safety condition, not as a normal successful result.

---

# 2026-08-15

## Phase 6 — Inngest Jobs and Status Tracking

### What was built

- Added Inngest client configuration.
- Added single-image processing function.
- Added batch image processing function.
- Added job service.
- Added job creation.
- Added deterministic job IDs.
- Added job progress tracking.
- Added failure handling.
- Added job status APIs.
- Added `/api/inngest`.
- Connected successful image ingestion to asynchronous processing.

### Architecture

The intended flow is:

```text
Image persisted
      ↓
Job created
      ↓
Inngest event sent
      ↓
Worker executes
      ↓
Vision processing
      ↓
Embedding generation
      ↓
Image completed
      ↓
Job completed
```

### Where AI helped

AI connected the asynchronous workflow to the existing Image and Job models.

### Where AI was wrong

The initial implementation used an outdated Inngest `createFunction` signature.

### What was manually corrected

The Inngest function registration was updated to match the installed package API.

Job completion logic was also tightened so incomplete jobs cannot incorrectly become completed.

### Deterministic job IDs

Single-image jobs use:

```text
process_image:<imageId>
```

Example:

```text
process_image:6a81194bc0dc2fd636dcc2a7
```

### Automated verification

Relevant tests:

```text
tests/services/jobService.test.js
tests/api/jobs.test.js
```

All passed.

### Live verification

A real uploaded image created a live job:

```text
jobId:
process_image:6a81194bc0dc2fd636dcc2a7
```

The resulting job record contained:

```text
status: completed
total: 1
processed: 1
failed: 0
flagged: 0
attempts: 1
```

The associated image contained:

```text
processingStatus: completed
processingAttempts: 1
```

### Lesson

Testing job creation in isolation is not enough.

The stronger verification is:

```text
real image
    ↓
real job
    ↓
real processing
    ↓
real persisted result
```

---

# 2026-08-15

## Phase 7 — AI Usage and Cost Tracking

### What was built

- Added AI usage tracking service.
- Added Gemini usage metadata extraction.
- Added configurable cost rates.
- Added AIUsage persistence.
- Added usage list API.
- Added usage summary API.
- Connected Vision operations to usage tracking.
- Added embedding usage tracking.

### Where AI helped

AI usage accounting was isolated from the core AI request logic.

This created a separate audit trail for:

```text
provider
model
operation
tokens
cost
reference
```

### Important decision

Usage tracking must never break the primary AI processing flow.

If usage persistence fails, the AI request should not unnecessarily fail or retry solely because accounting failed.

### Automated verification

Relevant tests:

```text
tests/services/costTrackingService.test.js
tests/services/visionUsage.test.js
tests/api/usage.test.js
```

All passed.

### Live usage verification

A real Vision operation generated an AIUsage record:

```text
provider: google
model: gemini-3.6-flash
operation: vision
inputTokens: 1231
outputTokens: 48
totalTokens: 1550
estimatedCost: 0
```

A real embedding operation generated:

```text
provider: google
model: gemini-embedding-2
operation: embedding
inputTokens: 36
outputTokens: 0
totalTokens: 36
estimatedCost: 0
```

### Live usage summary

The running API returned:

```text
records: 28
inputTokens: 7774
outputTokens: 296
totalTokens: 10047
estimatedCost: 0
```

### Lesson

AI usage should be observable as part of the application rather than hidden inside external API calls.

---

# 2026-08-15

## Phase 8 — Posts and Article Analysis

### What was built

- Added article metadata schema.
- Added Gemini article analysis service.
- Added structured extraction of:
  - subject
  - category
  - keywords
- Added Post CRUD service.
- Added Post controller.
- Added Post routes.
- Added article-analysis tests.
- Added Post API tests.

### Where AI helped

The strict AI-output trust-boundary pattern from image analysis was reused for article analysis.

### Important decisions

Post creation analyzes title and content before persistence.

Post updates refresh article metadata when title or content changes.

The resulting Post record contains:

```text
subject
category
keywords
embedding
embeddingModel
```

### Automated verification

Relevant tests:

```text
tests/services/articleAnalysisService.test.js
tests/schemas/articleMetadataSchema.test.js
tests/services/postService.test.js
tests/api/posts.test.js
```

All passed.

### Live database evidence

The application successfully retrieved persisted posts including:

```text
The Behavior of Red Foxes
Understanding Gray Wolves
Best Practices for Remote Work
```

These records contained structured metadata and embeddings.

### Remaining limitation

A separate direct Gemini article-analysis request was not recorded as final evidence.

However, the service behavior is covered by automated tests and its persisted outputs are used by the live evaluation.

---

# 2026-08-15

## Phase 9 — Embeddings and Similarity

### What was built

- Added Gemini embedding configuration.
- Added embedding service.
- Added image embedding generation.
- Added post embedding generation.
- Added embedding text builders.
- Added embedding usage tracking.
- Added embedding persistence.
- Added cosine similarity utility.
- Added vector validation.
- Added zero-vector protection.
- Added dimension validation.

### Image embedding input

Images are represented using:

```text
caption
subject
category
attributes
```

### Post embedding input

Posts are represented using:

```text
title
content
subject
category
keywords
```

### Important decision

No separate vector database was introduced.

Embeddings are stored directly as numeric arrays in MongoDB.

This keeps the capstone architecture simpler and makes the matching process explicit.

### Where AI helped

AI helped isolate embedding generation into a dedicated service.

### Where AI was wrong

No significant issue was recorded in this phase.

### Automated verification

Relevant tests:

```text
tests/services/embeddingService.test.js
tests/services/imageProcessingService.test.js
tests/services/postService.test.js
tests/utils/cosineSimilarity.test.js
```

All passed.

### Live verification

A real processed image contained:

```text
embeddingModel: gemini-embedding-2
```

and a persisted numeric embedding array.

The corresponding AIUsage record showed:

```text
provider: google
model: gemini-embedding-2
operation: embedding
```

The persisted embeddings were subsequently consumed by the live matching engine.

### Cosine similarity

The live evaluation produced:

```text
red fox → red fox: 0.4213
gray wolf → gray wolf: 0.4264
```

### Lesson

Embeddings are useful for semantic retrieval, but they cannot by themselves guarantee that an image is safe or correct.

This led directly to the mismatch guard.

---

# 2026-08-15

## Phase 10 — Matching Engine and Mismatch Guard

### What was built

- Added mismatch guard service.
- Added similarity threshold checks.
- Added vision confidence checks.
- Added subject compatibility checks.
- Added category compatibility checks.
- Added candidate ranking.
- Added Suggestion persistence.
- Added `GET /api/posts/:id/images`.
- Added forced candidate support.
- Added `no_confident_match` behavior.
- Added matching tests.
- Added mismatch guard tests.

### Matching architecture

The final matching flow is:

```text
Post
 ↓
Post embedding
 ↓
Completed image candidates
 ↓
Cosine similarity
 ↓
Rank candidates
 ↓
Mismatch Guard
 ↓
Accept / Reject
 ↓
Persist Suggestion
 ↓
Return recommendations
```

### Important decision

The highest similarity candidate is not automatically accepted.

The system deliberately separates:

```text
semantic similarity
```

from:

```text
safety / relevance validation
```

### Mismatch checks

The guard checks:

```text
similarity
image confidence
subject compatibility
category compatibility
```

### Where AI helped

AI encoded the mismatch guard as reusable business logic rather than hard-coding only the red fox / gray wolf example.

### Where AI was wrong

No major implementation error was recorded in this phase.

### Automated verification

Relevant tests:

```text
tests/matching/matchingService.test.js
tests/api/matching.test.js
tests/guard/mismatchGuardService.test.js
```

All passed.

### Live red fox test

The red fox article produced:

```text
status: matched
```

Top candidate:

```text
subject: red fox
similarityScore: 0.42131531009290035
guardStatus: accepted
decision: recommended
```

### Live gray wolf test

The gray wolf article produced:

```text
status: matched
```

Top candidate:

```text
subject: gray wolf
similarityScore: 0.42640793873841476
guardStatus: accepted
decision: recommended
```

### Live safety test

The red fox article's gray wolf candidate produced:

```text
similarity: 0.3358349472638014
guardStatus: rejected
```

Reasons included:

```text
Similarity 0.336 is below threshold 0.4
Subject mismatch: expected red fox, detected gray wolf
```

### Live no-match test

The remote-work article produced:

```text
status: no_confident_match
suggestions: []
```

The highest candidate similarity was only:

```text
0.2912505493332135
```

and the candidate was rejected.

### Lesson

Similarity alone is not sufficient.

A safe system must be able to say:

```text
"No confident match"
```

rather than selecting an incorrect image.

---

# 2026-08-16

## Phase 11 — Human Review API

### What was built

- Added review service.
- Added suggestion inspection.
- Added review history.
- Added generic review creation.
- Added approval endpoint.
- Added rejection endpoint.
- Added review validation.
- Added review API tests.
- Added review service tests.

### Review workflow

The intended workflow is:

```text
Recommendation
      ↓
Human reviewer
      ↓
Approve / Reject
      ↓
Review record
      ↓
Suggestion current state updated
```

### Where AI helped

AI kept human review explicit and auditable.

### Where AI was wrong

The initial review service did not consistently validate suggestion IDs before querying MongoDB.

Invalid MongoDB ObjectIds could result in:

```text
500 Internal server error
```

instead of:

```text
404 Suggestion not found
```

### What was manually corrected

The review service was updated to validate the suggestion ID before database operations.

Invalid IDs now return:

```text
404 Suggestion not found
```

### Important decisions

Review records are retained as history.

The current Suggestion stores the latest review outcome.

Approval maps to:

```text
approved
```

Rejection maps to:

```text
manually_rejected
```

### Automated verification

The review service regression tests passed.

The full test suite later passed:

```text
23 test suites passed
90 tests passed
```

### Live verification

The following were successfully verified:

```text
approval persistence
rejection persistence
review history retrieval
invalid suggestion ID handling
```

### Lesson

Identifier validation belongs at the service boundary.

A malformed ID should become a controlled application error, not a database exception that leaks into a generic 500 response.

---

# 2026-08-16

## Phase 12 — Evaluation Dataset

### What was built

- Added evaluation dataset generation.
- Added `scripts/seedEvaluation.js`.
- Added `scripts/evaluate.js`.
- Added `npm run seed:evaluation`.
- Added `npm run evaluate`.
- Added Top-1 precision measurement.
- Added evaluation images:
  - `red-fox.jpg`
  - `gray-wolf.jpg`
  - `dog.jpg`
  - `unrelated.jpg`

### Evaluation cases

The evaluation dataset contains:

```text
1. red fox article should match red fox image
2. gray wolf article should match gray wolf image
3. remote work article should have no confident animal image match
```

### Important decision

Evaluation must use:

```text
real persisted records
```

rather than only mocked services.

The evaluation therefore loads the actual MongoDB-backed posts and images and invokes the real matching engine.

---

# 2026-08-16

## Phase 13 — Live Evaluation

### Command

```bash
npm run evaluate
```

### MongoDB connection

The evaluation connected successfully:

```text
mongodb_connected
database: test
```

### Matching execution

The evaluator reported:

```text
matching_performed
postId: 6a80f2b302dea112cbd4e4ab
candidates: 6
accepted: 3
```

For the gray wolf article:

```text
matching_performed
postId: 6a80f2b802dea112cbd4e4ad
candidates: 6
accepted: 1
```

For the remote-work article:

```text
matching_performed
postId: 6a80f2bb02dea112cbd4e4af
candidates: 6
accepted: 0
```

### Final evaluation

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

### Case 1

```text
red fox article
        ↓
red fox image
        ↓
CORRECT

Similarity:
0.4213
```

### Case 2

```text
gray wolf article
        ↓
gray wolf image
        ↓
CORRECT

Similarity:
0.4264
```

### Case 3

```text
remote work article
        ↓
no confident animal image
        ↓
no_confident_match
        ↓
CORRECT
```

### Lesson

A good evaluation is not only about finding correct matches.

It must also test whether the system correctly refuses incorrect matches.

The third evaluation case therefore measures rejection behavior rather than retrieval alone.

---

# 2026-08-16

## Phase 14 — Final Automated Verification

### Full test suite

Command:

```bash
npm test
```

Final result:

```text
PASS  tests/api/reviews.test.js
PASS  tests/api/usage.test.js
PASS  tests/api/jobs.test.js
PASS  tests/api/images.test.js
PASS  tests/api/posts.test.js
PASS  tests/api/matching.test.js
PASS  tests/api/health.test.js
PASS  tests/services/embeddingService.test.js
PASS  tests/services/reviewService.test.js
PASS  tests/models/indexes.test.js
PASS  tests/services/visionService.test.js
PASS  tests/services/articleAnalysisService.test.js
PASS  tests/services/visionUsage.test.js
PASS  tests/schemas/articleMetadataSchema.test.js
PASS  tests/matching/matchingService.test.js
PASS  tests/guard/mismatchGuardService.test.js
PASS  tests/services/costTrackingService.test.js
PASS  tests/utils/cosineSimilarity.test.js
PASS  tests/services/imageProcessingService.test.js
PASS  tests/schemas/imageMetadataSchema.test.js
PASS  tests/services/jobService.test.js
PASS  tests/middleware/validation.test.js
PASS  tests/services/postService.test.js
```

Final summary:

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
Snapshots:   0 total
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

No ESLint errors were reported.

---

# 2026-08-16

## Phase 15 — Documentation and Evidence

### What was updated

- Updated `README.md`.
- Updated `BUILDLOG.md`.
- Updated `EVIDENCE.md`.
- Updated `docs/implementation-plan.md`.
- Updated `capstone.yaml`.
- Added evaluation command to the capstone command list.
- Documented live evaluation results.
- Documented review workflow verification.
- Documented MongoDB live verification.
- Documented Cloudinary verification.
- Documented Gemini Vision verification.
- Documented asynchronous image processing.
- Distinguished live verification from mocked/local verification.
- Documented known limitations.

### Documentation principle

The documentation deliberately avoids claiming external integrations are live-verified unless there is actual evidence.

The project distinguishes between:

```text
IMPLEMENTED
```

```text
AUTOMATED TESTED
```

```text
LIVE VERIFIED
```

and:

```text
PENDING
```

This prevents documentation from overstating the maturity of the system.

---

# Final Architecture

The completed core system follows:

```text
                    ┌───────────────────┐
                    │   Client / API    │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Express Backend   │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
        ┌───────────┐   ┌────────────┐   ┌─────────────┐
        │ Cloudinary│   │  MongoDB   │   │   Inngest   │
        └─────┬─────┘   └──────┬─────┘   └──────┬──────┘
              │                │                │
              │                │                ▼
              │                │         ┌──────────────┐
              │                │         │ Image Worker │
              │                │         └──────┬───────┘
              │                │                │
              │                │                ▼
              │                │         ┌──────────────┐
              │                │         │ Gemini Vision│
              │                │         └──────┬───────┘
              │                │                │
              │                │                ▼
              │                │         ┌──────────────┐
              │                │         │ Zod + Guard  │
              │                │         └──────┬───────┘
              │                │                │
              │                │                ▼
              │                │         ┌──────────────┐
              │                │         │ Gemini Embed │
              │                │         └──────┬───────┘
              │                │                │
              │                ◄────────────────┘
              │                │
              │                ▼
              │         ┌───────────────┐
              │         │ Stored Vectors│
              │         └───────┬───────┘
              │                 │
              │                 ▼
              │         ┌───────────────┐
              │         │ Cosine Similar│
              │         └───────┬───────┘
              │                 │
              │                 ▼
              │         ┌───────────────┐
              │         │ Mismatch Guard│
              │         └───────┬───────┘
              │                 │
              │          ┌──────┴──────┐
              │          │             │
              │          ▼             ▼
              │      Recommend      Reject
              │          │             │
              │          └──────┬──────┘
              │                 ▼
              │          ┌─────────────┐
              │          │ Human Review│
              │          └─────────────┘
              │
              ▼
        Persisted Images
```

---

# Engineering Lessons

## 1. Never trust AI output directly

AI output must always pass a validation boundary.

Correct pattern:

```text
AI
 ↓
Parse
 ↓
Validate
 ↓
Confidence
 ↓
Business Rules
 ↓
Persistence
```

---

## 2. Similarity is not enough

Embedding similarity measures semantic closeness.

It does not guarantee:

```text
correct subject
correct category
sufficient confidence
safe recommendation
```

Therefore:

```text
Similarity
    ↓
Mismatch Guard
```

is required.

---

## 3. Rejection is a valid result

The system should not force a recommendation when confidence is insufficient.

Correct behavior:

```text
No safe candidate
      ↓
no_confident_match
```

This is preferable to recommending an irrelevant image.

---

## 4. Safety rules should be deterministic

The mismatch guard does not ask another AI model whether an image is safe.

Instead it applies deterministic rules:

```text
similarity threshold
confidence threshold
subject compatibility
category compatibility
```

This makes the decision explainable and testable.

---

## 5. External integrations need live verification

Passing mocked tests does not prove that an external service works.

The project therefore separately verified:

```text
Cloudinary
Gemini API
Gemini Vision
MongoDB
live image processing
live AI usage tracking
live matching
```

This distinction is important for honest engineering documentation.

---

## 6. Validate identifiers before database operations

Invalid MongoDB IDs should not become generic server errors.

The correct pattern is:

```text
Request
 ↓
Validate ID
 ↓
Database query
```

rather than:

```text
Request
 ↓
Database query
 ↓
MongoDB CastError
 ↓
500
```

---

## 7. Keep external integrations isolated

The project keeps external systems behind dedicated configuration and service layers:

```text
Gemini
Cloudinary
MongoDB
Inngest
```

This makes the system easier to:

- test
- mock
- debug
- replace
- document

---

## 8. Usage tracking should not break AI processing

AI usage accounting is important, but accounting failure should not unnecessarily break the main AI workflow.

Therefore usage recording is isolated and safely handled.

---

## 9. Evaluation must test both acceptance and rejection

A retrieval system should not only answer:

```text
"Can I find the correct image?"
```

It should also answer:

```text
"Can I correctly refuse an incorrect image?"
```

The evaluation therefore includes:

```text
red fox → red fox
gray wolf → gray wolf
remote work → no confident match
```

---

## 10. Live evaluation is stronger than mocked evaluation

The final evaluation uses:

```text
real MongoDB records
real persisted embeddings
real matching logic
real mismatch guard
real suggestion persistence
```

rather than relying only on mocks.

---

## 11. Build incrementally

The project was built in phases:

```text
Foundation
 ↓
MongoDB
 ↓
Cloudinary
 ↓
Gemini Vision
 ↓
Async Processing
 ↓
Usage Tracking
 ↓
Posts
 ↓
Embeddings
 ↓
Matching
 ↓
Mismatch Guard
 ↓
Human Review
 ↓
Evaluation
 ↓
Documentation
```

Each major subsystem was tested before moving to the next.

---

# Final Verified Project State

The current implementation has the following verified state:

```text
Express application
        PASS

Health endpoint
        PASS

Validation
        PASS

MongoDB models
        PASS

MongoDB connectivity
        LIVE VERIFIED

MongoDB persistence
        LIVE VERIFIED

MongoDB indexes
        PASS

Cloudinary configuration
        PASS

Cloudinary connectivity
        LIVE VERIFIED

Cloudinary upload
        LIVE VERIFIED

Gemini API connectivity
        LIVE VERIFIED

Gemini Vision
        LIVE VERIFIED

Vision schema validation
        PASS

Low-confidence handling
        PASS

Inngest architecture
        PASS

Real image processing
        LIVE VERIFIED

AI usage tracking
        LIVE VERIFIED

Post CRUD
        PASS

Article analysis
        PASS

Embedding generation
        LIVE VERIFIED

Embedding persistence
        LIVE VERIFIED

Cosine similarity
        PASS

Matching engine
        LIVE VERIFIED

Mismatch guard
        LIVE VERIFIED

Red fox matching
        LIVE VERIFIED

Gray wolf matching
        LIVE VERIFIED

No-confident-match behavior
        LIVE VERIFIED

Suggestion persistence
        LIVE VERIFIED

Human approval
        LIVE VERIFIED

Human rejection
        LIVE VERIFIED

Review history
        LIVE VERIFIED

Invalid suggestion ID handling
        PASS

Evaluation dataset
        PASS

Live evaluation
        PASS

Top-1 precision
        100.00%

Automated tests
        23/23 suites
        90/90 tests

ESLint
        PASS

Deployment
        PENDING
```

---

# Final Metrics

```text
Automated Test Suites:
23 / 23 PASS

Automated Tests:
90 / 90 PASS

Evaluation Cases:
3

Correct Evaluation Cases:
3

Top-1 Precision:
100.00%

Live Gemini Vision:
PASS

Live Cloudinary:
PASS

Live MongoDB:
PASS

Live Image Processing:
PASS

Live Embedding Persistence:
PASS

Live Matching:
PASS

Live Human Review:
PASS

Deployment:
PENDING
```

---

# Current Remaining Work

The core capstone implementation is complete.

The primary remaining engineering task is:

```text
PUBLIC DEPLOYMENT
```

Deployment should not be marked complete until the deployed application successfully responds to:

```http
GET /health
```

from a public URL.

After deployment, the final verification should include:

```text
deployed /health
deployed API
deployed MongoDB connectivity
deployed Cloudinary connectivity
deployed Gemini connectivity
deployed Inngest processing
```

The local implementation should not be modified merely to claim deployment completion.

---
```
