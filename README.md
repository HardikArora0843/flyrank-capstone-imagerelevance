# FlyRank AI Capstone 3: Image Relevance and Auto-Tagging

Backend service for AI-powered image understanding, metadata extraction, semantic image-to-post matching, mismatch detection, human review, asynchronous processing, and evaluation.

The system is designed to prevent the common failure mode where the highest semantic similarity image is blindly selected even when the image subject is incorrect.

## Core Problem

Given a collection of images and a blog post, the system must:

1. Understand the images using AI vision analysis.
2. Extract structured metadata from images.
3. Analyze blog posts into structured metadata.
4. Generate semantic embeddings for images and posts.
5. Rank candidate images using cosine similarity.
6. Apply deterministic safety checks after semantic ranking.
7. Reject weak or semantically incorrect candidates.
8. Return `no_confident_match` when no candidate is sufficiently safe.
9. Allow a human reviewer to approve or reject suggestions.
10. Record review history.
11. Evaluate matching quality using a labeled dataset.

## Core Demonstration

The project demonstrates three important scenarios:

- A red fox article correctly matches a red fox image.
- A gray wolf image is rejected when evaluated against a red fox article because the subject does not match.
- An unrelated remote-work article returns `no_confident_match` instead of forcing an animal image.

## Technology Stack

- Node.js
- Express.js
- MongoDB / Mongoose
- Cloudinary
- Google Gemini Vision
- Google Gemini Embeddings
- Inngest
- Zod
- Jest
- Supertest
- ESLint

## Architecture

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

Image processing is asynchronous:

```text
Image Upload
    |
    v
Cloudinary
    |
    v
MongoDB Image(pending)
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
    +---- low confidence ---> flagged
    |
    v
Image Embedding
    |
    v
MongoDB Image(completed)
```

## Matching Safety

The matching engine does not trust cosine similarity alone.

For each candidate image, the mismatch guard checks:

- semantic similarity
- image vision confidence
- subject compatibility
- category compatibility

This means a semantically related but incorrect image can be rejected.

For example:

```text
Post subject:
red fox

Candidate image:
gray wolf

Result:
rejected

Reason:
Subject mismatch: expected red fox, detected gray wolf
```

If no candidate passes all required checks:

```json
{
  "status": "no_confident_match"
}
```

## Embeddings

Image embeddings are generated from:

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

A separate vector database is intentionally not used because the expected capstone dataset is small enough for backend cosine similarity.

## AI Output Safety

Gemini output is treated as untrusted external data.

The AI services:

- request structured JSON
- parse the model response
- validate the response using Zod
- reject malformed output
- retry recoverable failures
- fail safely after retry exhaustion
- flag low-confidence image metadata instead of marking it completed

## Asynchronous Processing

Image processing uses Inngest.

The flow is:

```text
POST /api/images
       |
       v
Cloudinary upload
       |
       v
Image record created
       |
       v
Deterministic job:
process_image:<imageId>
       |
       v
image/process.requested
       |
       v
Inngest worker
       |
       v
Gemini Vision
       |
       v
Embedding generation
       |
       v
Completed / Flagged / Failed
```

Deterministic job IDs make single-image enqueueing idempotent at the job-record level.

## Human Review

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

## API Endpoints

### Health

```http
GET /health
```

Expected:

```json
{
  "status": "ok"
}
```

### Images

```http
POST /api/images
GET /api/images
GET /api/images/:id
DELETE /api/images/:id
```

### Posts

```http
POST /api/posts
GET /api/posts
GET /api/posts/:id
PATCH /api/posts/:id
DELETE /api/posts/:id
```

### Matching

```http
GET /api/posts/:id/images
```

Optional candidate filtering:

```text
?candidateImageIds=imageId1,imageId2
```

### Jobs

```http
GET /api/jobs
GET /api/jobs/:id
POST /api/jobs/process-pending-images
POST /api/inngest
```

### AI Usage

```http
GET /api/usage
GET /api/usage/summary
```

### Reviews

```http
GET /api/suggestions/:id
GET /api/suggestions/:id/reviews
POST /api/suggestions/:id/reviews
POST /api/suggestions/:id/approve
POST /api/suggestions/:id/reject
```

## Evaluation

The project contains a reproducible evaluation dataset under:

```text
dataset/evaluation.json
```

The dataset contains three labeled cases:

1. Red fox article -> red fox image
2. Gray wolf article -> gray wolf image
3. Remote work article -> no confident animal match

Generate the dataset from MongoDB:

```bash
npm run seed:evaluation
```

Run the evaluation:

```bash
npm run evaluate
```

### Verified Evaluation Result

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

Results:

```text
Red fox article
Expected: red fox image
Actual:   red fox image
Result:   CORRECT

Gray wolf article
Expected: gray wolf image
Actual:   gray wolf image
Result:   CORRECT

Remote work article
Expected: none
Actual:   none
Status:   no_confident_match
Result:   CORRECT
```

## Testing

Run the complete automated test suite:

```bash
npm test
```

Current verified result:

```text
Test Suites: 23 passed, 23 total
Tests:       90 passed, 90 total
```

Run linting:

```bash
npm run lint
```

Current result:

```text
PASS
```

## Local Setup

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run the development server:

```bash
npm run dev
```

The API runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/health
```

## Environment Variables

Copy `.env.example` to `.env` and configure the required services.

### MongoDB

```env
MONGODB_URI=
```

### Cloudinary

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Gemini

```env
GEMINI_API_KEY=
GEMINI_VISION_MODEL=
GEMINI_TEXT_MODEL=
GEMINI_EMBEDDING_MODEL=
GEMINI_API_BASE_URL=
```

Additional configuration controls:

```env
VISION_MAX_ATTEMPTS=3
ARTICLE_ANALYSIS_MAX_ATTEMPTS=3
VISION_CONFIDENCE_THRESHOLD=0.70
SIMILARITY_THRESHOLD=0.4
```

### Inngest

```env
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

## Database

MongoDB is used for:

- Image
- Post
- Suggestion
- Review
- Job
- AIUsage

Initialize and synchronize indexes:

```bash
npm run migrate
```

The migration script uses Mongoose `syncIndexes()`.

## Cloudinary

Cloudinary stores image files.

MongoDB stores:

- Cloudinary secure URL
- Cloudinary public ID
- image metadata
- processing state
- embeddings

Raw image binary data is not stored in MongoDB.

## AI Usage Tracking

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

## Project Structure

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

## Verification Status

| Area | Status |
|---|---|
| Express API | Verified |
| Request validation | Verified |
| MongoDB connectivity | Verified |
| MongoDB models/indexes | Verified |
| Image API | Verified locally |
| Cloudinary integration | Configured; live upload not independently verified |
| Gemini Vision logic | Verified through automated tests |
| Gemini live calls | Not independently verified |
| Inngest processing logic | Verified through automated tests |
| Inngest external execution | Not independently verified |
| AI usage tracking | Verified |
| Article analysis | Verified through automated tests |
| Embeddings | Verified through automated tests and seeded evaluation data |
| Matching engine | Live verified |
| Mismatch guard | Live behavior demonstrated and fully tested |
| Review workflow | Live verified |
| Evaluation | Live verified |
| Deployment | Not yet verified |

## Important Engineering Decisions

### No frontend

This capstone is intentionally backend-focused.

### No vector database

The expected dataset size is small enough for direct cosine similarity in Node.js.

### Human-in-the-loop review

AI recommendations can be approved or rejected by a reviewer.

### Explicit rejection

The system prefers:

```text
no_confident_match
```

over returning an unsafe or weak match.

### AI output is untrusted

All structured Gemini output crosses a Zod validation boundary before it can update application state.

## Documentation

- `docs/design.md`
- `docs/architecture.md`
- `docs/implementation-plan.md`
- `BUILDLOG.md`
- `EVIDENCE.md`
- `dataset/README.md`

## Current Project Status

The core backend implementation and evaluation are complete locally.

Verified:

```text
23 test suites
90 automated tests
0 lint errors
3/3 evaluation cases correct
100% Top-1 precision
Live MongoDB-backed matching
Live MongoDB-backed review workflow
```

Deployment remains the final pending phase.