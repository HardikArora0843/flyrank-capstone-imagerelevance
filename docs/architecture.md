# System Architecture

## FlyRank AI Capstone 3 — Image Relevance and Auto-Tagging

This document describes the architecture of the FlyRank AI Capstone 3 backend.

The system is designed to:

- understand uploaded images using AI vision
- extract structured image metadata
- analyze article content
- generate embeddings for images and posts
- perform semantic image-to-post matching
- apply deterministic mismatch protection
- reject unsafe or weak recommendations
- return `no_confident_match` when appropriate
- support asynchronous processing
- support human review
- track AI usage
- evaluate matching quality
- run as a publicly deployed backend

---

# 1. Architecture Overview

The application follows a layered backend architecture.

```text
                         ┌──────────────────────┐
                         │   Client / Consumer   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Express REST API   │
                         └──────────┬───────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌──────────────┐          ┌──────────────┐
   │ Controllers │          │  Middleware  │          │    Routes    │
   └──────┬──────┘          └──────────────┘          └──────────────┘
          │
          ▼
   ┌────────────────────────────────────────────────────────────┐
   │                       Service Layer                        │
   │                                                            │
   │ Image │ Post │ Matching │ Review │ Job │ Usage │ AI       │
   └───────────────┬───────────────────────┬────────────────────┘
                   │                       │
          ┌────────┴────────┐       ┌──────┴──────────┐
          ▼                 ▼       ▼                 ▼
    ┌───────────┐     ┌──────────┐ ┌──────────┐ ┌────────────┐
    │ MongoDB   │     │Cloudinary│ │  Gemini  │ │  Inngest   │
    └───────────┘     └──────────┘ └──────────┘ └────────────┘
```

---

# 2. High-Level Components

The system consists of the following major components:

```text
Client
  ↓
Express API
  ↓
Controllers
  ↓
Services
  ↓
Persistence / External Services
```

The major external and infrastructure components are:

| Component | Responsibility |
|---|---|
| Express | HTTP API |
| MongoDB | Persistent application data |
| Mongoose | MongoDB object modeling |
| Cloudinary | Image storage |
| Gemini Vision | Image understanding |
| Gemini Text | Article analysis |
| Gemini Embeddings | Vector generation |
| Inngest | Asynchronous job execution |
| Zod | AI/API output validation |
| Jest | Automated testing |
| Supertest | HTTP API testing |
| Render | Public production deployment |

---

# 3. Layered Architecture

The application separates responsibilities across multiple layers.

```text
HTTP Layer
    ↓
Controller Layer
    ↓
Service Layer
    ↓
Model / External Service Layer
```

---

## 3.1 HTTP Layer

The HTTP layer contains:

```text
routes/
middleware/
```

Responsibilities include:

- route registration
- request parsing
- validation
- authentication-independent request handling
- rate limiting
- CORS
- security headers
- error handling

The application uses:

```text
helmet
cors
express-rate-limit
express.json
```

---

# 4. Route Architecture

The main API groups are:

```text
GET    /health

POST   /api/images
GET    /api/images
GET    /api/images/:id
DELETE /api/images/:id

POST   /api/posts
GET    /api/posts
GET    /api/posts/:id
PATCH  /api/posts/:id
DELETE /api/posts/:id

GET    /api/posts/:id/images

GET    /api/jobs
GET    /api/jobs/:id
POST   /api/jobs/process-pending-images

GET    /api/usage
GET    /api/usage/summary

GET    /api/suggestions/:id
GET    /api/suggestions/:id/reviews
POST   /api/suggestions/:id/reviews
POST   /api/suggestions/:id/approve
POST   /api/suggestions/:id/reject

POST   /api/inngest
```

---

# 5. Production Entry Point

The application starts from:

```text
src/server.js
```

The startup flow is:

```text
server.js
   ↓
load environment
   ↓
create Express app
   ↓
connect MongoDB
   ↓
start HTTP server
```

The application does not start serving requests until the database connection is established.

---

# 6. Root and Health Routes

The production application exposes:

```http
GET /
```

The root route redirects to:

```text
/health
```

This provides a useful landing response instead of exposing a generic Express 404 at the public root.

The health endpoint is:

```http
GET /health
```

Expected response:

```json
{
  "status": "ok"
}
```

Production deployment:

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

Production health behavior has been verified.

---

# 7. Image Processing Architecture

The image pipeline is asynchronous.

```text
Client
  │
  │ multipart/form-data
  ▼
POST /api/images
  │
  ▼
Multer
  │
  ▼
File Validation
  │
  ▼
Cloudinary Upload
  │
  ▼
MongoDB Image Record
  │
  ▼
Create Deterministic Job
  │
  ▼
Inngest Event
  │
  ▼
Image Processing Worker
  │
  ▼
Gemini Vision
  │
  ▼
Zod Validation
  │
  ▼
Confidence Check
  │
  ├───────────────┐
  │               │
  ▼               ▼
Completed       Flagged
  │
  ▼
Embedding Generation
  │
  ▼
MongoDB Persistence
```

---

# 8. Image Storage Architecture

Image binaries are stored in Cloudinary.

MongoDB stores references and metadata.

```text
Cloudinary
    │
    └── image binary

MongoDB
    │
    ├── cloudinaryUrl
    ├── cloudinaryPublicId
    ├── originalFilename
    ├── MIME type
    ├── processingStatus
    ├── metadata
    └── embedding
```

This prevents large binary objects from being stored directly inside MongoDB.

---

# 9. Image State Machine

Images move through processing states.

Conceptually:

```text
pending
   │
   ▼
processing
   │
   ├───────────────┐
   │               │
   ▼               ▼
completed        flagged
   │
   └───────┐
           ▼
          failed
```

The exact transitions depend on the processing outcome.

Low-confidence AI results are not automatically considered successful.

---

# 10. Gemini Vision Architecture

Gemini Vision is used to understand images.

The input is the actual image.

The expected structured output contains:

```json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": [
    "red fur",
    "white chest"
  ],
  "caption": "A red fox standing in grass.",
  "confidence": 0.98
}
```

The response passes through:

```text
Gemini
   ↓
Raw Response
   ↓
JSON Extraction
   ↓
Zod Schema
   ↓
Confidence Check
   ↓
Business Logic
   ↓
Persistence
```

Gemini output is therefore treated as untrusted external data.

---

# 11. AI Trust Boundary

The system deliberately does not allow raw AI output to directly modify application state.

The trust boundary is:

```text
External AI
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

This protects the application against:

- malformed JSON
- unexpected fields
- invalid types
- invalid confidence values
- incomplete AI responses
- temporary provider failures

---

# 12. Retry Architecture

Recoverable AI failures can be retried.

The configured retry values include:

```env
VISION_MAX_ATTEMPTS=3
ARTICLE_ANALYSIS_MAX_ATTEMPTS=3
```

Conceptually:

```text
AI Request
    │
    ▼
Success ───────────────► Continue
    │
    ▼
Recoverable Failure
    │
    ▼
Retry
    │
    ├── Success ───────► Continue
    │
    └── Exhausted ─────► Fail Safely
```

---

# 13. Low-Confidence Architecture

Vision confidence is checked after schema validation.

Configured threshold:

```env
VISION_CONFIDENCE_THRESHOLD=0.70
```

Behavior:

```text
confidence >= threshold
        ↓
continue processing
```

while:

```text
confidence < threshold
        ↓
flag image
```

This prevents uncertain AI classifications from automatically becoming trusted metadata.

---

# 14. Article Analysis Architecture

Posts are analyzed using Gemini.

The input includes:

```text
title
content
```

The AI extracts:

```text
subject
category
keywords
```

The architecture is:

```text
Post Request
     ↓
Title + Content
     ↓
Gemini Article Analysis
     ↓
Structured JSON
     ↓
Zod Validation
     ↓
Article Metadata
     ↓
Embedding Generation
     ↓
MongoDB Post
```

---

# 15. Post Architecture

A Post contains information such as:

```text
title
content
subject
category
keywords
embedding
embeddingModel
createdAt
updatedAt
```

When title or content changes, article metadata and the corresponding embedding can be refreshed.

---

# 16. Embedding Architecture

The project uses Gemini embeddings.

Two primary embedding types are generated.

## Image Embeddings

Image embeddings are generated from:

```text
caption
subject
category
attributes
```

Conceptually:

```text
Image Metadata
      ↓
Embedding Text
      ↓
Gemini Embedding Model
      ↓
Numeric Vector
      ↓
MongoDB
```

---

## Post Embeddings

Post embeddings are generated from:

```text
title
content
subject
category
keywords
```

Conceptually:

```text
Post Metadata
      ↓
Embedding Text
      ↓
Gemini Embedding Model
      ↓
Numeric Vector
      ↓
MongoDB
```

---

# 17. Vector Storage Decision

A separate vector database is intentionally not used.

The vectors are stored as numeric arrays in MongoDB.

Reason:

```text
Expected capstone dataset
        ↓
Small dataset
        ↓
Direct application-level similarity
        ↓
Simpler architecture
```

This makes the matching algorithm explicit and avoids unnecessary infrastructure.

---

# 18. Matching Architecture

The matching engine receives a Post and searches the completed image collection.

```text
Post
  │
  ▼
Post Embedding
  │
  ▼
Completed Image Candidates
  │
  ▼
Calculate Cosine Similarity
  │
  ▼
Rank Candidates
  │
  ▼
Mismatch Guard
  │
  ├───────────────┐
  │               │
  ▼               ▼
Accepted        Rejected
  │               │
  ▼               ▼
Suggestions     Rejection Reasons
```

---

# 19. Candidate Ranking

For every candidate:

```text
similarity = cosine(postEmbedding, imageEmbedding)
```

Candidates are ranked according to semantic similarity.

However:

```text
highest similarity
```

does not automatically mean:

```text
accepted recommendation
```

The mismatch guard is applied after ranking.

---

# 20. Mismatch Guard Architecture

The mismatch guard is deterministic.

It checks:

```text
1. Similarity threshold
2. Vision confidence
3. Subject compatibility
4. Category compatibility
```

Example:

```text
Post:
red fox

Candidate:
gray wolf

Similarity:
0.3358

Threshold:
0.4

Subject:
mismatch

Result:
REJECT
```

The system therefore separates:

```text
semantic retrieval
```

from:

```text
safety / relevance validation
```

---

# 21. Accepted Candidate Flow

An accepted candidate follows:

```text
Candidate
   ↓
Similarity Check
   ↓
Confidence Check
   ↓
Subject Check
   ↓
Category Check
   ↓
Accepted
   ↓
Suggestion
   ↓
recommended
```

Example:

```text
red fox article
      ↓
red fox image
      ↓
similarity: 0.4213
      ↓
subject match
      ↓
category match
      ↓
confidence: 0.98
      ↓
accepted
```

---

# 22. Rejected Candidate Flow

A rejected candidate follows:

```text
Candidate
   ↓
Guard
   ↓
One or more checks fail
   ↓
Rejected
   ↓
Reason recorded
```

Example:

```text
red fox article
      ↓
gray wolf image
      ↓
similarity below threshold
      +
subject mismatch
      ↓
rejected
```

The rejection reasons are retained in the Suggestion.

---

# 23. No-Confident-Match Architecture

If all candidates fail the mismatch guard:

```text
Candidates
     ↓
All rejected
     ↓
No safe candidate
     ↓
no_confident_match
```

Example:

```json
{
  "status": "no_confident_match",
  "suggestions": []
}
```

This is an intentional safety behavior.

The system prefers:

```text
no recommendation
```

over:

```text
incorrect recommendation
```

---

# 24. Human Review Architecture

Recommendations can be reviewed by a human.

```text
Suggestion
     ↓
Human Reviewer
     │
     ├──────────────┐
     ▼              ▼
 Approve          Reject
     │              │
     ▼              ▼
 approved      manually_rejected
     │              │
     └──────┬───────┘
            ▼
      Review Record
```

Review history is retained.

The current Suggestion stores the latest decision.

---

# 25. Review State

Automatic recommendation:

```text
recommended
```

Human approval:

```text
approved
```

Human rejection:

```text
manually_rejected
```

This allows the system to distinguish automated and human decisions.

---

# 26. Job Architecture

Jobs are represented in MongoDB.

A single-image job uses a deterministic ID:

```text
process_image:<imageId>
```

Example:

```text
process_image:6a81194bc0dc2fd636dcc2a7
```

This reduces duplicate job creation at the application job-record level.

---

# 27. Job State Tracking

Jobs track:

```text
status
type
total
processed
failed
flagged
attempts
startedAt
completedAt
createdAt
updatedAt
```

A successful one-image job can therefore show:

```text
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

# 28. Inngest Architecture

Inngest executes asynchronous image processing.

```text
Express
   │
   ▼
Create Job
   │
   ▼
Send Event
   │
   ▼
Inngest
   │
   ▼
Image Processing Function
   │
   ▼
Image Processing Service
   │
   ├── Gemini Vision
   ├── Validation
   └── Embedding
   │
   ▼
MongoDB
```

The Inngest endpoint is exposed through:

```http
POST /api/inngest
```

---

# 29. AI Usage Architecture

AI operations are tracked independently.

```text
AI Request
    │
    ├──────────────► Gemini
    │
    ▼
Usage Metadata
    │
    ▼
AIUsage
    │
    ├── provider
    ├── model
    ├── operation
    ├── tokens
    └── estimated cost
```

Usage persistence should not unnecessarily break the primary AI workflow.

---

# 30. Usage API

The application exposes:

```http
GET /api/usage
GET /api/usage/summary
```

The summary includes:

```text
records
inputTokens
outputTokens
totalTokens
estimatedCost
```

---

# 31. Data Model Architecture

The core MongoDB models are:

```text
Image
Post
Suggestion
Review
Job
AIUsage
```

Relationships are conceptually:

```text
Post
 │
 ├──────────────► Suggestion
 │                    │
 │                    ▼
 │                  Image
 │
 └──────────────► Embedding

Image
 │
 ├──────────────► Embedding
 └──────────────► Job

Suggestion
 │
 └──────────────► Review

AI Operations
 │
 └──────────────► AIUsage
```

---

# 32. Image Model

The Image model stores:

```text
originalFilename
cloudinaryUrl
cloudinaryPublicId
processingStatus
processingAttempts
subject
category
attributes
caption
confidence
embedding
embeddingModel
timestamps
```

---

# 33. Post Model

The Post model stores:

```text
title
content
subject
category
keywords
embedding
embeddingModel
timestamps
```

---

# 34. Suggestion Model

A Suggestion stores:

```text
post reference
image reference
similarityScore
guardStatus
decision
reason
guardReasons
timestamps
```

This allows both recommendations and rejected candidates to be explained.

---

# 35. Review Model

A Review stores:

```text
suggestion reference
action
reviewer information
optional notes
timestamp
```

Review records are retained as history.

---

# 36. Job Model

The Job model stores:

```text
jobId
type
status
total
processed
failed
flagged
attempts
startedAt
completedAt
timestamps
```

---

# 37. AIUsage Model

The AIUsage model records:

```text
provider
model
operation
reference
inputTokens
outputTokens
totalTokens
estimatedCost
timestamps
```

---

# 38. Security and Reliability Architecture

The API includes:

```text
Helmet
CORS
Rate Limiting
Request Validation
Error Handling
AI Output Validation
Identifier Validation
```

Rate limiting is configured through:

```env
RATE_LIMIT_MAX=300
```

The default window is:

```text
15 minutes
```

---

# 39. Error Handling

Errors are handled through centralized middleware.

Conceptually:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Error
  ↓
Application Error
  ↓
Error Handler
  ↓
HTTP Response
```

Invalid MongoDB identifiers are validated before database operations where appropriate.

---

# 40. Configuration Architecture

Environment variables are centralized through:

```text
src/config/env.js
```

Major configuration groups include:

```text
Application
MongoDB
Cloudinary
Gemini
Inngest
Rate Limiting
Confidence Threshold
Similarity Threshold
Usage Cost
```

Secrets are not committed to Git.

`.env` is ignored through `.gitignore`.

---

# 41. Testing Architecture

The project uses multiple levels of testing.

```text
Unit Tests
   ↓
Service Tests
   ↓
Model Tests
   ↓
API Tests
   ↓
Integration / Live Verification
   ↓
Production Verification
```

The final automated suite contains:

```text
23 test suites
90 tests
```

All passed.

---

# 42. Evaluation Architecture

Evaluation is separate from normal application execution.

```text
Evaluation Dataset
       ↓
MongoDB Records
       ↓
Real Matching Engine
       ↓
Mismatch Guard
       ↓
Expected vs Actual
       ↓
Top-1 Precision
```

Three cases are evaluated:

```text
Red fox
Gray wolf
Remote work
```

Final verified result:

```text
3/3 correct
100.00% Top-1 precision
```

---

# 43. Deployment Architecture

The application is publicly deployed using Render.

```text
                  Internet
                     │
                     ▼
          ┌──────────────────────┐
          │       Render         │
          │  Express Application │
          └──────────┬───────────┘
                     │
          ┌──────────┼───────────┐
          │          │           │
          ▼          ▼           ▼
      MongoDB    Cloudinary    Gemini
          │
          ▼
       Inngest
```

Production URL:

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

The deployed service has been verified through:

```text
/health
/api/usage/summary
/api/jobs
/api/posts/:id/images
/api/suggestions/:id
```

Production matching and rejection behavior have also been verified.

---

# 44. Production Request Flow

A production image-processing request follows:

```text
Internet
   ↓
Render
   ↓
Express
   ↓
Image API
   ↓
Cloudinary
   ↓
MongoDB
   ↓
Inngest
   ↓
Gemini Vision
   ↓
Gemini Embedding
   ↓
MongoDB
```

A production matching request follows:

```text
Internet
   ↓
Render
   ↓
Express
   ↓
Post
   ↓
MongoDB
   ↓
Stored Embeddings
   ↓
Cosine Similarity
   ↓
Mismatch Guard
   ↓
Suggestions
```

---

# 45. Production Verification

The deployed application has been verified for:

```text
Production health
Production API
Production MongoDB-backed data
Production jobs
Production AI usage data
Production embeddings
Production matching
Production mismatch rejection
Production no-confident-match behavior
Production human review
Production evaluation
```

Final deployment status:

```text
LIVE VERIFIED
```

---

# 46. Complete System Flow

The complete architecture can be summarized as:

```text
                       CLIENT
                          │
                          ▼
                  ┌───────────────┐
                  │ Express API   │
                  └───────┬───────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
          Image API    Post API   Review API
              │           │           │
              ▼           ▼           │
         Cloudinary    Gemini         │
              │           │           │
              ▼           ▼           │
           MongoDB ◄──────┘           │
              │                       │
              ▼                       │
          Inngest                     │
              │                       │
              ▼                       │
       Image Processing               │
              │                       │
              ▼                       │
        Gemini Vision                │
              │                       │
              ▼                       │
        Zod Validation               │
              │                       │
              ▼                       │
       Confidence Check              │
              │                       │
              ▼                       │
      Gemini Embeddings              │
              │                       │
              ▼                       │
      Stored Embeddings              │
              │                       │
              ▼                       │
      Cosine Similarity              │
              │                       │
              ▼                       │
       Mismatch Guard                │
              │                       │
        ┌─────┴─────┐                 │
        ▼           ▼                 │
     Accepted     Rejected             │
        │           │                 │
        └─────┬─────┘                 │
              ▼                       │
         Suggestions ◄────────────────┘
              │
              ▼
        Human Review
```

---

# 47. Final Architecture Principles

The architecture follows these principles:

## Separation of Concerns

Controllers handle HTTP concerns.

Services handle business logic.

Models handle persistence.

External integrations are isolated.

---

## AI as an Untrusted Dependency

AI responses are validated before persistence.

---

## Deterministic Safety

The mismatch guard makes final recommendation decisions explainable and testable.

---

## Asynchronous Processing

Image processing is moved to background jobs so that expensive AI operations do not need to block the primary request lifecycle.

---

## Human-in-the-Loop

AI recommendations remain reviewable by humans.

---

## Observable AI Usage

Token and cost metadata are recorded.

---

## Reproducible Evaluation

The system includes a deterministic evaluation dataset and evaluation script.

---

## Production Verification

The project distinguishes between code that exists, code that passes automated tests, and behavior verified against real infrastructure.

The current production deployment is:

```text
LIVE VERIFIED
```

---

# 48. Final Architecture Status

```text
Express API                 PASS
MongoDB                     LIVE VERIFIED
Cloudinary                  LIVE VERIFIED
Gemini API                  LIVE VERIFIED
Gemini Vision               LIVE VERIFIED
Gemini Embeddings           LIVE VERIFIED
Inngest                     LIVE VERIFIED
Zod Validation              PASS
Async Processing            LIVE VERIFIED
AI Usage Tracking           LIVE VERIFIED
Matching Engine             LIVE VERIFIED
Mismatch Guard              LIVE VERIFIED
Human Review                LIVE VERIFIED
Evaluation                  LIVE VERIFIED
Render Deployment           LIVE VERIFIED
Production Health           PASS
Production API              PASS
Production Evaluation       PASS
```

Final status:

```text
ARCHITECTURE COMPLETE
PRODUCTION DEPLOYMENT LIVE
```
````

---

