# FlyRank AI Capstone: Image Relevance and Auto-Tagging

Backend service for AI-powered image understanding, metadata extraction, semantic image-to-post matching, mismatch detection, human review, asynchronous processing, usage tracking, and evaluation.

The system is designed to prevent the common failure mode where the highest semantic similarity image is blindly selected even when the image subject is incorrect.

---

## Core Problem

Given a collection of images and a blog post, the system must:

1. Understand images using AI vision analysis.
2. Extract structured metadata from images.
3. Analyze blog posts into structured metadata.
4. Generate semantic embeddings for images and posts.
5. Rank candidate images using cosine similarity.
6. Apply deterministic safety checks after semantic ranking.
7. Reject weak or semantically incorrect candidates.
8. Return `no_confident_match` when no candidate is sufficiently safe.
9. Allow a human reviewer to approve or reject suggestions.
10. Record review history.
11. Track AI usage and token consumption.
12. Evaluate matching quality using a labeled dataset.
13. Support asynchronous image processing through Inngest.
14. Run as a publicly deployed backend service.

---

# Core Demonstration

The project demonstrates three important scenarios:

### 1. Correct semantic match

A red fox article correctly matches a red fox image.

```text
Red fox article
      ↓
Red fox image
      ↓
Accepted
      ↓
Recommended
```

### 2. Incorrect subject rejection

A gray wolf image is rejected when evaluated against a red fox article.

```text
Red fox article
      ↓
Gray wolf image
      ↓
Rejected
```

Reasons include:

```text
Similarity below threshold
Subject mismatch
```

### 3. No confident match

An unrelated remote-work article does not receive an animal image recommendation.

```text
Remote work article
      ↓
No suitable image
      ↓
no_confident_match
```

The system therefore avoids forcing an unsafe recommendation.

---

# Technology Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- Cloudinary
- Google Gemini Vision
- Google Gemini Embeddings
- Inngest
- Zod
- Jest
- Supertest
- ESLint
- Render

---

# Architecture

The system follows a layered backend architecture:

```text
Client
  |
  v
Express REST API
  |
  +--------------------+
  |                    |
  v                    v
MongoDB              Cloudinary
  |
  +--------------------------+
  |                          |
  v                          v
Posts                    Images
  |                          |
  v                          v
Article Analysis        Gemini Vision
  |                          |
  v                          v
Post Embedding          Validated Metadata
  |                          |
  |                          v
  |                     Image Embedding
  |                          |
  +------------+-------------+
               |
               v
       Matching Engine
               |
               v
       Cosine Similarity
               |
               v
       Mismatch Guard
               |
        +------+------+
        |             |
        v             v
    Accepted       Rejected
        |             |
        +------+------+
               |
               v
          Suggestions
               |
               v
          Human Review
```

---

# Image Processing Architecture

Image processing is asynchronous:

```text
Image Upload
    |
    v
Cloudinary
    |
    v
MongoDB Image
    |
    v
Inngest Event
    |
    v
Image Processing Job
    |
    v
Gemini Vision
    |
    v
Zod Validation
    |
    +---- low confidence ----> flagged
    |
    v
Image Embedding
    |
    v
MongoDB Image
(completed)
```

The resulting image record contains structured AI metadata and an embedding.

---

# Matching Architecture

The matching pipeline is:

```text
Post
  |
  v
Post Metadata
  |
  v
Post Embedding
  |
  v
Completed Image Candidates
  |
  v
Image Embeddings
  |
  v
Cosine Similarity
  |
  v
Candidate Ranking
  |
  v
Mismatch Guard
  |
  +----------------------+
  |                      |
  v                      v
Accepted              Rejected
  |                      |
  v                      v
Suggestion          Rejected Candidate
  |
  v
Human Review
```

The system intentionally separates:

```text
semantic retrieval
```

from:

```text
deterministic safety validation
```

---

# Matching Safety

The matching engine does not trust cosine similarity alone.

For each candidate image, the mismatch guard checks:

- semantic similarity
- image vision confidence
- subject compatibility
- category compatibility

A candidate must satisfy the required checks before it can become a recommendation.

For example:

```text
Post subject:
red fox

Candidate image:
gray wolf

Result:
rejected

Reasons:
Similarity below threshold
Subject mismatch
```

The production system demonstrated this behavior with a real gray wolf candidate evaluated against the red fox article.

The verified production result was approximately:

```text
Similarity:
0.3358

Guard:
rejected
```

with:

```text
Subject mismatch:
expected red fox,
detected gray wolf
```

---

# No Confident Match

If no candidate passes the required matching and safety checks, the system returns:

```json
{
  "status": "no_confident_match"
}
```

Example:

```text
Remote work article
        |
        v
Animal image candidates
        |
        v
All candidates rejected
        |
        v
no_confident_match
```

This behavior is intentional.

The system prefers:

```text
no_confident_match
```

over returning an irrelevant or unsafe image.

---

# Embeddings

Image embeddings are generated from structured image information including:

- caption
- subject
- category
- visible attributes

Post embeddings are generated from:

- title
- content
- subject
- category
- keywords

Embeddings are stored directly as numeric arrays in MongoDB.

The current implementation uses:

```text
gemini-embedding-2
```

for embedding generation.

A separate vector database is intentionally not used because the expected capstone dataset is small enough for direct cosine similarity in Node.js.

This keeps the architecture simple and makes the matching process explicit.

---

# AI Output Safety

Gemini output is treated as untrusted external data.

The AI services:

- request structured JSON
- extract the model response
- parse JSON
- validate the response using Zod
- reject malformed output
- retry recoverable failures
- fail safely after retry exhaustion
- check confidence thresholds
- flag low-confidence image metadata instead of automatically marking it completed

The trust boundary is:

```text
Gemini
   |
   v
Parse
   |
   v
Schema Validation
   |
   v
Confidence Check
   |
   v
Business Rules
   |
   v
Persistence
```

Raw AI output is never allowed to directly update application state.

---

# Asynchronous Processing

Image processing uses Inngest.

The flow is:

```text
POST /api/images
       |
       v
Cloudinary Upload
       |
       v
Image Record Created
       |
       v
Deterministic Job Created
       |
       v
image/process.requested
       |
       v
Inngest Worker
       |
       v
Gemini Vision
       |
       v
Embedding Generation
       |
       v
Completed / Flagged / Failed
```

Single-image jobs use deterministic job identifiers.

Example:

```text
process_image:<imageId>
```

This provides job-record-level idempotency for individual image processing.

Production verification confirmed completed image-processing jobs, including:

```text
type:
process_image

status:
completed

total:
1

processed:
1

failed:
0

flagged:
0

attempts:
1
```

---

# Human Review

Suggestions can be inspected and reviewed through:

```http
GET /api/suggestions/:id
GET /api/suggestions/:id/reviews

POST /api/suggestions/:id/reviews
POST /api/suggestions/:id/approve
POST /api/suggestions/:id/reject
```

Approval changes the current Suggestion decision to:

```text
approved
```

Rejection changes it to:

```text
manually_rejected
```

Review records are retained as history.

The review workflow is:

```text
Recommendation
      |
      v
Human Reviewer
      |
   +--+--+
   |     |
   v     v
Approve Reject
   |     |
   +--+--+
      |
      v
Review Record
      |
      v
Suggestion State Updated
```

---

# API Endpoints

## Root

```http
GET /
```

The root route redirects to:

```http
GET /health
```

This allows the deployed public URL to immediately display the application's health status.

---

## Health

```http
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

Production health endpoint:

```text
https://flyrank-capstone-imagerelevance.onrender.com/health
```

---

## Images

```http
POST /api/images
GET /api/images
GET /api/images/:id
DELETE /api/images/:id
```

---

## Posts

```http
POST /api/posts
GET /api/posts
GET /api/posts/:id
PATCH /api/posts/:id
DELETE /api/posts/:id
```

---

## Matching

```http
GET /api/posts/:id/images
```

Optional candidate filtering:

```text
?candidateImageIds=imageId1,imageId2
```

---

## Jobs

```http
GET /api/jobs
GET /api/jobs/:id
POST /api/jobs/process-pending-images
POST /api/inngest
```

---

## AI Usage

```http
GET /api/usage
GET /api/usage/summary
```

---

## Reviews

```http
GET /api/suggestions/:id
GET /api/suggestions/:id/reviews
POST /api/suggestions/:id/reviews
POST /api/suggestions/:id/approve
POST /api/suggestions/:id/reject
```

---

# Evaluation

The project contains a reproducible evaluation dataset under:

```text
dataset/evaluation.json
```

The evaluation dataset contains three labeled cases:

```text
1. Red fox article → red fox image
2. Gray wolf article → gray wolf image
3. Remote work article → no confident animal image match
```

Generate the evaluation dataset from MongoDB:

```bash
npm run seed:evaluation
```

Run the evaluation:

```bash
npm run evaluate
```

---

# Evaluation Result

The evaluation produced:

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

### Case 1

```text
Red fox article
Expected: red fox image
Actual:   red fox image
Result:   CORRECT
```

### Case 2

```text
Gray wolf article
Expected: gray wolf image
Actual:   gray wolf image
Result:   CORRECT
```

### Case 3

```text
Remote work article
Expected: none
Actual:   none
Status:   no_confident_match
Result:   CORRECT
```

### Important qualification

The current evaluation contains only three labeled cases.

Therefore:

```text
100.00% Top-1 precision
```

describes performance on the current capstone evaluation dataset and should not be interpreted as a broad statistical benchmark.

---

# Production Verification

The backend is deployed publicly on Render.

Production URL:

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

Deployment status:

```text
LIVE VERIFIED
```

The deployed application was tested through live production API requests.

---

## Production Health

The production health endpoint was verified successfully:

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

Result:

```text
PASS
```

The root production URL also redirects to the health endpoint.

---

## Production Usage API

The production usage summary endpoint was verified:

```http
GET /api/usage/summary
```

Verified production result:

```json
{
  "summary": {
    "records": 28,
    "inputTokens": 7774,
    "outputTokens": 296,
    "totalTokens": 10047,
    "estimatedCost": 0
  }
}
```

Result:

```text
LIVE VERIFIED
```

---

## Production Jobs

The production jobs API was verified:

```http
GET /api/jobs
```

Production records included completed image-processing jobs.

Verified example:

```text
type:
process_image

status:
completed

total:
1

processed:
1

failed:
0

flagged:
0

attempts:
1
```

Result:

```text
LIVE VERIFIED
```

---

# Production Matching Results

The production matching endpoint was tested using the three evaluation scenarios.

Endpoint:

```http
GET /api/posts/:id/images
```

---

## Production Red Fox Case

The red fox article returned:

```text
status:
matched
```

Accepted candidate:

```text
subject:
red fox

category:
animal

confidence:
0.98

similarityScore:
0.42131531009290035

guardStatus:
accepted

decision:
recommended
```

Result:

```text
CORRECT
```

---

## Production Gray Wolf Rejection

When the red fox article was evaluated against the gray wolf candidate, the production mismatch guard returned:

```text
similarityScore:
0.3358349472638014

guardStatus:
rejected

decision:
rejected
```

Reasons included:

```text
Similarity 0.336 is below threshold 0.4

Subject mismatch:
expected red fox,
detected gray wolf
```

Result:

```text
CORRECTLY REJECTED
```

---

## Production Gray Wolf Case

The gray wolf article returned:

```text
status:
matched
```

Accepted candidate:

```text
subject:
gray wolf

category:
animal

confidence:
0.96

similarityScore:
0.42640793873841476

guardStatus:
accepted

decision:
recommended
```

Result:

```text
CORRECT
```

---

## Production Remote Work Case

The remote-work article returned:

```text
status:
no_confident_match
```

Accepted suggestions:

```text
[]
```

All available candidates were rejected.

Examples included:

```text
Golden retriever
Similarity: 0.2912505493332135

ASUS TUF gaming laptop
Similarity: 0.259592477461211

Gray wolf
Similarity: 0.236252504197225

Red fox
Similarity: 0.198526401791648
```

The rejection reasons included:

```text
Similarity below threshold
Subject mismatch
Category mismatch
```

Final result:

```text
no_confident_match
```

Result:

```text
CORRECT
```

---

# Production Evaluation Summary

The deployed production system successfully demonstrated:

```text
Red fox article
      ↓
Red fox image
      ↓
CORRECT
```

```text
Gray wolf article
      ↓
Gray wolf image
      ↓
CORRECT
```

```text
Remote work article
      ↓
No confident animal image
      ↓
no_confident_match
      ↓
CORRECT
```

Production evaluation:

```text
Posts evaluated:
3

Correct cases:
3

Top-1 precision:
100.00%
```

---

# Production Embedding Verification

Production image records contain persisted embeddings generated using:

```text
gemini-embedding-2
```

The stored embedding is a numeric vector persisted in MongoDB.

The production matching flow uses the persisted vectors:

```text
Persisted Post Embedding
        +
Persisted Image Embedding
        |
        v
Cosine Similarity
        |
        v
Candidate Ranking
        |
        v
Mismatch Guard
        |
        v
Recommendation / Rejection
```

Production matching results demonstrate that persisted embeddings are being consumed by the matching engine.

---

# Production Safety Verification

The deployed system successfully demonstrated three different outcomes:

### Accepted

```text
Strong semantic similarity
+
Correct subject
+
Correct category
+
Sufficient confidence
        ↓
accepted
```

### Rejected

```text
Weak similarity
or
Subject mismatch
or
Category mismatch
or
Insufficient confidence
        ↓
rejected
```

### No confident match

```text
No candidate satisfies the required checks
        ↓
no_confident_match
```

This is the central safety property of the project.

---

# Testing

Run the complete automated test suite:

```bash
npm test
```

Verified result:

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
Snapshots:   0 total
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run linting:

```bash
npm run lint
```

Verified result:

```text
PASS
```

No ESLint errors were reported.

---

# Local Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy:

```text
.env.example
```

to:

```text
.env
```

Then configure the required services.

## 3. Run database migration

```bash
npm run migrate
```

## 4. Run tests

```bash
npm test
```

## 5. Start development server

```bash
npm run dev
```

The local API runs on:

```text
http://localhost:5000
```

Health endpoint:

```text
http://localhost:5000/health
```

Root endpoint:

```text
http://localhost:5000/
```

The root endpoint redirects to the health endpoint.

---

# Environment Variables

Copy `.env.example` to `.env` and configure the required services.

## Application

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*
RATE_LIMIT_MAX=300
```

## MongoDB

```env
MONGODB_URI=
```

## Cloudinary

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Gemini

```env
GEMINI_API_KEY=
GEMINI_VISION_MODEL=
GEMINI_TEXT_MODEL=
GEMINI_EMBEDDING_MODEL=
GEMINI_API_BASE_URL=
```

## Retry Configuration

```env
VISION_MAX_ATTEMPTS=3
ARTICLE_ANALYSIS_MAX_ATTEMPTS=3
```

## Cost Configuration

```env
GEMINI_VISION_INPUT_COST_PER_1K=0
GEMINI_VISION_OUTPUT_COST_PER_1K=0
GEMINI_EMBEDDING_COST_PER_1K=0
```

## Matching Configuration

```env
VISION_CONFIDENCE_THRESHOLD=0.70
SIMILARITY_THRESHOLD=0.4
```

## Inngest

```env
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
INNGEST_DEV=1
```

---

# Database

MongoDB is used for:

- Images
- Posts
- Suggestions
- Reviews
- Jobs
- AIUsage

Initialize and synchronize indexes:

```bash
npm run migrate
```

The migration script uses Mongoose:

```text
syncIndexes()
```

MongoDB stores the application records, metadata, embeddings, processing state, job state, review history, and AI usage information.

---

# Cloudinary

Cloudinary stores image files.

MongoDB stores:

- Cloudinary secure URL
- Cloudinary public ID
- original filename
- image metadata
- processing status
- processing attempts
- embeddings

Raw image binary data is not stored in MongoDB.

The production system has successfully processed Cloudinary-hosted images.

---

# AI Usage Tracking

Gemini operations record usage metadata where available.

Tracked information includes:

- provider
- model
- operation
- image/post identifier
- input tokens
- output tokens
- total tokens
- estimated cost

Usage can be inspected through:

```http
GET /api/usage
GET /api/usage/summary
```

A production usage summary was verified successfully.

---

# Project Structure

```text
src/
├── config/
├── controllers/
├── jobs/
├── middleware/
├── models/
├── routes/
├── schemas/
├── services/
└── utils/

tests/
├── api/
├── guard/
├── matching/
├── middleware/
├── models/
├── schemas/
├── services/
└── utils/

scripts/
├── evaluate.js
├── migration.js
├── seed.js
├── seedEvaluation.js
├── seedImages.js
└── seedPosts.js

dataset/
├── evaluation.json
├── README.md
└── images/

docs/
├── architecture.md
├── design.md
└── implementation-plan.md
```

---

# Verification Status

| Area | Status |
|---|---|
| Express API | Verified |
| Root route | Verified |
| Root → `/health` redirect | Verified |
| Health endpoint | Verified |
| Request validation | Verified |
| MongoDB connectivity | Live verified |
| MongoDB models | Verified |
| MongoDB persistence | Live verified |
| MongoDB indexes | Verified |
| Cloudinary configuration | Verified |
| Cloudinary connectivity | Live verified |
| Cloudinary upload | Live verified |
| Gemini API connectivity | Live verified |
| Gemini Vision logic | Verified |
| Gemini Vision live call | Live verified |
| Zod AI output validation | Verified |
| Low-confidence handling | Verified |
| Inngest architecture | Verified |
| Real image processing | Live verified |
| Production job tracking | Live verified |
| AI usage tracking | Live verified |
| Production usage API | Live verified |
| Article analysis | Verified |
| Embedding generation | Live verified |
| Embedding persistence | Live verified |
| Production embeddings | Live verified |
| Cosine similarity | Verified |
| Matching engine | Live verified |
| Mismatch guard | Live verified |
| Red fox matching | Live verified |
| Gray wolf matching | Live verified |
| Incorrect subject rejection | Live verified |
| `no_confident_match` | Live verified |
| Suggestion persistence | Live verified |
| Human approval | Live verified |
| Human rejection | Live verified |
| Review history | Live verified |
| Evaluation dataset | Verified |
| Local evaluation | Verified |
| Production evaluation | Live verified |
| Top-1 precision | 100.00% |
| Automated tests | 23/23 suites |
| Automated test cases | 90/90 |
| ESLint | PASS |
| Render deployment | Live verified |
| Production API | Live verified |

---

# Important Engineering Decisions

## No frontend

This capstone is intentionally backend-focused.

The primary deliverable is an AI-powered backend service with REST APIs, asynchronous processing, matching, safety checks, review, and evaluation.

---

## No vector database

The expected dataset size is small enough for direct cosine similarity in Node.js.

Embeddings are stored as numeric arrays in MongoDB.

This avoids unnecessary infrastructure while keeping the matching logic explicit.

---

## Human-in-the-loop review

AI recommendations are not treated as irreversible decisions.

A human reviewer can:

```text
Approve
```

or:

```text
Reject
```

a suggestion.

Review history is retained.

---

## Explicit rejection

The system prefers:

```text
no_confident_match
```

over returning an unsafe or weak match.

---

## AI output is untrusted

All structured Gemini output crosses a Zod validation boundary before it can update application state.

---

## Deterministic mismatch guard

The final safety decision is based on deterministic business rules rather than asking another AI model to decide whether the recommendation is safe.

The guard evaluates:

```text
Similarity
Confidence
Subject
Category
```

This makes rejection behavior explainable and testable.

---

## Asynchronous image processing

Image processing is separated from the initial upload request using Inngest.

This allows:

```text
Upload
   ↓
Persist
   ↓
Queue
   ↓
Process asynchronously
```

rather than making the upload request wait for the entire AI pipeline.

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

The mismatch guard applies deterministic rules:

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

The project therefore separately verified real integrations and production behavior including:

```text
Cloudinary
Gemini API
Gemini Vision
MongoDB
Image Processing
AI Usage Tracking
Embeddings
Matching
Human Review
Render Deployment
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

Usage recording is therefore isolated from the primary AI processing path.

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
 ↓
Deployment
 ↓
Production Verification
```

Each major subsystem was tested before moving to the next.

---

# Final Project Status

The core capstone implementation, automated testing, evaluation, deployment, and production verification are complete.

Final verified state:

```text
Express application
        PASS

Health endpoint
        PASS

Root route
        PASS

Root → /health redirect
        PASS

MongoDB
        LIVE VERIFIED

Cloudinary
        LIVE VERIFIED

Gemini API
        LIVE VERIFIED

Gemini Vision
        LIVE VERIFIED

Real image processing
        LIVE VERIFIED

Inngest job processing
        LIVE VERIFIED

AI usage tracking
        LIVE VERIFIED

Embedding generation
        LIVE VERIFIED

Embedding persistence
        LIVE VERIFIED

Matching engine
        LIVE VERIFIED

Mismatch guard
        LIVE VERIFIED

Red fox matching
        LIVE VERIFIED

Gray wolf matching
        LIVE VERIFIED

Incorrect subject rejection
        LIVE VERIFIED

No-confident-match behavior
        LIVE VERIFIED

Human approval
        LIVE VERIFIED

Human rejection
        LIVE VERIFIED

Review history
        LIVE VERIFIED

Production deployment
        LIVE VERIFIED

Production API
        LIVE VERIFIED

Production evaluation
        LIVE VERIFIED
```

---

# Final Metrics

```text
Automated Test Suites:
23 / 23 PASS

Automated Tests:
90 / 90 PASS

ESLint:
PASS

Evaluation Cases:
3

Correct Evaluation Cases:
3

Top-1 Precision:
100.00%

Production Evaluation Cases:
3

Correct Production Cases:
3

Production Top-1 Precision:
100.00%

Production Health:
PASS

Production Jobs:
VERIFIED

Production Usage API:
VERIFIED

Production Matching:
VERIFIED

Production Mismatch Guard:
VERIFIED

Render Deployment:
LIVE VERIFIED
```

---

# Production URL

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

Root:

```text
https://flyrank-capstone-imagerelevance.onrender.com/
```

The root route redirects to:

```text
https://flyrank-capstone-imagerelevance.onrender.com/health
```

Health endpoint:

```text
https://flyrank-capstone-imagerelevance.onrender.com/health
```

---

# Documentation

Additional project documentation is available in:

```text
docs/design.md
docs/architecture.md
docs/implementation-plan.md
BUILDLOG.md
EVIDENCE.md
dataset/README.md
```

These documents describe the design, architecture, implementation history, evidence, evaluation dataset, engineering decisions, and verification process.

---

# Conclusion

FlyRank AI Capstone 3 implements a complete backend pipeline for AI-powered image relevance and auto-tagging.

The system combines:

```text
Image Understanding
        +
Structured AI Metadata
        +
Semantic Embeddings
        +
Cosine Similarity
        +
Deterministic Mismatch Guard
        +
Asynchronous Processing
        +
Human Review
        +
Usage Tracking
        +
Evaluation
        +
Production Deployment
```

The key safety principle is:

```text
Do not blindly trust the highest similarity image.
```

Instead:

```text
Retrieve
   ↓
Rank
   ↓
Validate
   ↓
Guard
   ↓
Recommend only if safe
   ↓
Otherwise:
no_confident_match
```

The final system has been tested automatically, evaluated against the labeled dataset, deployed publicly, and verified through live production API behavior.

```text
23/23 test suites passed
90/90 tests passed
0 lint errors
3/3 evaluation cases correct
100.00% Top-1 precision
Production deployment verified
Production matching verified
Production safety behavior verified
```

**Project Status: COMPLETE**
````
