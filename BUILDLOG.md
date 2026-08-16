# Build Log

This file records the implementation history, verification results, mistakes, corrections, and important engineering decisions made during development of FlyRank AI Capstone 3.

---

## 2026-08-15

### Phase 1 — Design and Project Initialization

#### What was built

- Inspected the workspace.
- Created the backend project skeleton.
- Added an Express application with `GET /health`.
- Added required project metadata and documentation placeholders.
- Installed Node dependencies.
- Added Jest and Supertest.
- Added automated health-check tests.
- Verified the health endpoint with a live HTTP request.

#### Where AI helped

- Generated the initial backend structure.
- Translated the capstone requirements into a runnable Express backend.
- Created the initial documentation structure.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- Updated npm scripts to call local package entrypoints through `node`.
- This was necessary because the Windows workspace path contains spaces and `&`, which caused problems with the npm command shim.

#### Important decisions

- Keep the project backend-only.
- Use MongoDB for persistence.
- Use Cloudinary for image storage.
- Use Gemini for AI vision, article analysis, and embeddings.
- Use Inngest for asynchronous processing.
- Use Zod for strict validation.
- Use Jest and Supertest for automated testing.
- Defer external-service verification until the corresponding implementation is stable.

#### Verification

- Health test passed.
- Live `GET /health` returned:

```json
{
  "status": "ok"
}
```

#### Known local environment issue

The plain `npm` command initially pointed to a missing user-profile npm installation.

The bundled npm CLI under:

```text
C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js
```

was used successfully.

---

## 2026-08-15

### Phase 2 — Project Hardening and Phase 3 — MongoDB Foundation

#### What was built

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
- Added model and validation tests.

#### Where AI helped

- Translated persistence requirements into Mongoose schemas.
- Created deterministic schema and index tests.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- None recorded in this phase.

#### Important decisions

- Use `syncIndexes()` for reproducible MongoDB index setup.
- Keep schema and index verification independent from live Atlas credentials where possible.
- Do not claim MongoDB as live-verified until an actual database connection succeeds.

#### Verification

- MongoDB models and indexes passed automated tests.
- Lint passed.
- Health endpoint remained functional.

#### Later live verification

MongoDB connectivity was subsequently verified successfully during evaluation dataset seeding and evaluation execution.

---

## 2026-08-15

### Phase 4 — Cloudinary and Image Ingestion

#### What was built

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

#### Where AI helped

- Connected the image ingestion flow from multipart upload to Cloudinary and MongoDB persistence.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- Added `Buffer` as an ESLint global after lint detected it in tests.
- Reduced logger noise during tests so expected API errors remain readable.

#### Important decisions

- Keep image binaries out of MongoDB.
- Store images in Cloudinary.
- Store Cloudinary URL and public ID in MongoDB.
- Keep image upload validation at the API boundary.

#### Verification

- Image API tests passed.
- Invalid live upload request returned:

```json
{
  "error": {
    "message": "Image file is required"
  }
}
```

#### Remaining limitation

A dedicated real Cloudinary upload was not independently verified during final evidence collection.

---

## 2026-08-15

### Phase 5 — Gemini Vision

#### What was built

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

#### Where AI helped

- Encapsulated Gemini output handling behind a strict trust boundary.
- Created deterministic tests for valid, malformed, low-confidence, and retry scenarios.

#### Where AI was wrong

- Initial Gemini configuration relied only on the already-loaded environment object, which made test-time environment overrides difficult.

#### What was manually corrected

- Updated Gemini configuration to read current `process.env` values when creating request configuration.
- Added `fetch` to ESLint globals for Node.js 22.

#### Important decisions

Gemini output is treated as untrusted input.

The processing flow is:

```text
Gemini
  ↓
JSON parsing
  ↓
Zod validation
  ↓
Confidence check
  ↓
Application state
```

Low-confidence valid metadata becomes:

```text
flagged
```

instead of:

```text
completed
```

#### Verification

- Vision service tests passed.
- Image processing tests passed.
- Schema validation tests passed.
- Lint passed.

#### Remaining limitation

A dedicated live Gemini Vision API call was not independently verified during final evidence collection.

---

## 2026-08-15

### Phase 6 — Inngest Jobs and Status Tracking

#### What was built

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

#### Where AI helped

- Connected the asynchronous workflow to the existing Image and Job models.

#### Where AI was wrong

- Initially used an outdated Inngest `createFunction` signature.

#### What was manually corrected

- Updated the Inngest function registration to match the installed package API.
- Tightened job completion so incomplete jobs cannot incorrectly move to completed.

#### Important decisions

Single-image jobs use deterministic IDs:

```text
process_image:<imageId>
```

This makes enqueueing idempotent at the job-record level.

The processing sequence is:

```text
Image persisted
    ↓
Job created
    ↓
Inngest event sent
    ↓
Worker processes image
```

#### Verification

- Job service tests passed.
- Job API tests passed.
- Inngest registration tests passed.
- Invalid job filter was verified through the live API.

#### Remaining limitation

External Inngest execution was not independently verified.

---

## 2026-08-15

### Phase 7 — AI Usage and Cost Tracking

#### What was built

- Added AI usage tracking service.
- Added Gemini usage metadata extraction.
- Added configurable cost rates.
- Added AIUsage persistence.
- Added usage list API.
- Added usage summary API.
- Connected Vision operations to usage tracking.
- Added embedding usage tracking.

#### Where AI helped

- Kept AI usage accounting isolated from core AI request logic.
- Added auditability for Gemini operations.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- Added a safe usage-recording wrapper.
- AI usage persistence failures are logged without causing unnecessary Gemini retries.

#### Important decisions

Usage tracking must never break the primary AI processing flow.

Failed Gemini attempts can record zero-token usage when no token metadata is available.

#### Verification

- Cost tracking tests passed.
- Vision usage tests passed.
- Usage API tests passed.
- Lint passed.

#### Current status

AIUsage persistence is implemented through MongoDB and MongoDB connectivity has subsequently been verified.

---

## 2026-08-15

### Phase 8 — Posts and Article Analysis

#### What was built

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

#### Where AI helped

- Reused the strict AI-output trust-boundary pattern from image analysis.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- None recorded in this phase.

#### Important decisions

Post creation analyzes title and content before persistence.

Post updates refresh article metadata when title or content changes.

#### Verification

- Article schema tests passed.
- Article analysis tests passed.
- Post service tests passed.
- Post API tests passed.
- Lint passed.

#### Remaining limitation

Live Gemini article-analysis execution was not independently verified.

---

## 2026-08-15

### Phase 9 — Embeddings and Similarity

#### What was built

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

#### Where AI helped

- Kept vector generation isolated in a dedicated service.
- Implemented explainable backend cosine similarity instead of adding a vector database.

#### Where AI was wrong

- None recorded in this phase.

#### What was manually corrected

- None recorded in this phase.

#### Important decisions

Images are embedded from:

```text
caption
subject
category
attributes
```

Posts are embedded from:

```text
title
content
subject
category
keywords
```

Vectors are stored directly in MongoDB.

#### Verification

- Embedding service tests passed.
- Cosine similarity tests passed.
- Image processing persistence tests passed.
- Post embedding persistence tests passed.
- Lint passed.

#### Later live verification

Persisted image embeddings were successfully used by the live MongoDB-backed evaluation.

---

## 2026-08-15

### Phase 10 — Matching Engine and Mismatch Guard

#### What was built

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

#### Where AI helped

- Encoded the central safety requirement without hard-coding only the fox/wolf example.

#### Where AI was wrong

- None recorded in this phase.

#### Important decisions

The highest cosine similarity candidate is not automatically accepted.

The system follows:

```text
Similarity Ranking
        ↓
Mismatch Guard
        ↓
Accept / Reject
```

A candidate must pass all required safety checks.

#### Verification

Automated tests verified:

- fox acceptance
- wolf rejection
- low similarity rejection
- low confidence rejection
- category mismatch rejection
- candidate ranking
- forced candidate rejection
- no candidate behavior

#### Live verification

MongoDB-backed evaluation subsequently verified:

```text
red fox article → red fox image
gray wolf article → gray wolf image
remote work article → no_confident_match
```

---

## 2026-08-16

### Phase 11 — Review API

#### What was built

- Added review service.
- Added suggestion inspection.
- Added review history.
- Added generic review creation.
- Added approval endpoint.
- Added rejection endpoint.
- Added review validation.
- Added review API tests.
- Added review service tests.

#### Where AI helped

- Kept human review workflow explicit and auditable.

#### Where AI was wrong

- The initial review service did not consistently validate suggestion IDs before querying MongoDB.
- Invalid MongoDB ObjectIds could produce an internal server error instead of a clean 404.

#### What was manually corrected

The review service was updated to validate the suggestion ID before calling MongoDB.

Invalid IDs now return:

```text
404 Suggestion not found
```

instead of:

```text
500 Internal server error
```

#### Important decisions

Review records are append-only history.

The current Suggestion stores the latest review outcome.

Approval results in:

```text
approved
```

Rejection results in:

```text
manually_rejected
```

#### Verification

The review service test suite passed.

The full suite later passed:

```text
23 test suites passed
90 tests passed
```

#### Live verification

- Approval was successfully persisted.
- Rejection was successfully persisted.
- Review history was successfully retrieved.
- Invalid suggestion IDs returned `404 Suggestion not found`.

---

## 2026-08-16

### Phase 12 — Evaluation

#### What was built

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

#### Evaluation dataset

The generated dataset contains three cases:

```text
1. red fox article should match red fox image
2. gray wolf article should match gray wolf image
3. remote work article should have no confident animal image match
```

#### MongoDB verification

The evaluation dataset was successfully generated from persisted MongoDB records.

MongoDB connection was successfully established during:

```bash
npm run seed:evaluation
```

#### Live evaluation

Command:

```bash
npm run evaluate
```

Result:

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

Individual results:

```text
1. red fox article should match red fox image
   Result: CORRECT
   Similarity: 0.4213

2. gray wolf article should match gray wolf image
   Result: CORRECT
   Similarity: 0.4264

3. remote work article should have no confident animal image match
   Status: no_confident_match
   Result: CORRECT
```

#### Important lesson

Evaluation must use actual persisted records and actual matching logic rather than relying only on mocked unit tests.

---

## 2026-08-16

### Phase 13 — Documentation and Evidence

#### What was built

- Updated `README.md`.
- Updated `BUILDLOG.md`.
- Updated `EVIDENCE.md`.
- Updated `docs/implementation-plan.md`.
- Updated `capstone.yaml`.
- Added evaluation command to the capstone command list.
- Documented live evaluation results.
- Documented review workflow verification.
- Documented MongoDB live verification.
- Distinguished live verification from mocked/local verification.

#### Final automated verification

Command:

```bash
npm test
```

Result:

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
```

Lint:

```bash
npm run lint
```

Result:

```text
PASS
```



---

# Engineering Lessons

## 1. Do not trust AI output directly

AI output must always pass a validation boundary.

```text
AI
 ↓
Parse
 ↓
Validate
 ↓
Business rules
 ↓
Persistence
```

## 2. Similarity is not enough

A high embedding similarity does not guarantee a correct image.

The mismatch guard is necessary.

## 3. Rejecting is a valid result

When the system cannot confidently identify a suitable image:

```text
no_confident_match
```

is safer than selecting the least-bad image.

## 4. Validate identifiers before database operations

Invalid MongoDB IDs should be handled at the service boundary so they do not become generic 500 errors.

## 5. Tests and live verification are different

Passing mocked tests does not prove that an external service works.

Documentation therefore distinguishes:

```text
automated/local verification
```

from:

```text
live external-service verification
```

## 6. Keep external integrations isolated

Gemini, Cloudinary, MongoDB, and Inngest interactions are kept behind dedicated configuration/services wherever practical.

## 7. Build incrementally

Each major phase was implemented and verified before moving to the next subsystem.

---
