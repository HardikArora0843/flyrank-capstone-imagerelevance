# System Design

## FlyRank AI Capstone 3 — Image Relevance and Auto-Tagging

This document explains the design decisions behind the Image Relevance and Auto-Tagging backend.

The design focuses on four primary requirements:

1. understand images and articles using AI
2. retrieve semantically relevant images
3. prevent incorrect recommendations
4. provide explainable, reviewable decisions

The system therefore combines probabilistic AI capabilities with deterministic application rules.

---

# 1. Design Goals

The system is designed to achieve the following goals.

## Primary Goals

```text
Image Understanding
Article Understanding
Semantic Retrieval
Mismatch Detection
Human Review
Asynchronous Processing
Usage Tracking
Evaluation
Production Deployment
```

---

# 2. Core Design Principle

The most important design principle is:

```text
Semantic similarity is not sufficient for final recommendation.
```

A pure embedding system could behave like:

```text
Article
   ↓
Embedding
   ↓
Nearest Image
   ↓
Recommend
```

This can produce incorrect recommendations.

For example:

```text
Article:
Red fox

Candidate:
Gray wolf

Embedding similarity:
moderately high
```

A naive system might recommend the wolf.

This project instead uses:

```text
Embedding Retrieval
       ↓
Mismatch Guard
       ↓
Final Decision
```

---

# 3. Hybrid AI + Deterministic Design

The system combines:

```text
AI
+
Deterministic Rules
```

AI handles tasks that require semantic understanding:

```text
Image description
Subject identification
Category identification
Article understanding
Embedding generation
```

Deterministic code handles:

```text
Confidence thresholds
Similarity thresholds
Subject compatibility
Category compatibility
Review state
Job state
Evaluation
```

This division improves explainability.

---

# 4. Why AI Is Used

Traditional keyword matching would struggle with:

```text
"wild canine"
```

versus:

```text
"gray wolf"
```

or:

```text
"forest predator"
```

versus:

```text
"red fox"
```

Embeddings provide semantic representation.

Gemini Vision also allows the application to understand actual image content.

---

# 5. Why AI Is Not Fully Trusted

AI output can be:

- malformed
- incomplete
- uncertain
- inconsistent
- temporarily unavailable

Therefore all structured AI responses pass through validation.

Design:

```text
Gemini
   ↓
Parse
   ↓
Zod
   ↓
Confidence
   ↓
Business Rules
   ↓
Persistence
```

---

# 6. Image Metadata Design

Each processed image is represented using structured metadata.

Conceptually:

```json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": [
    "red fur",
    "bushy tail",
    "pointed ears"
  ],
  "caption": "A red fox standing in grass.",
  "confidence": 0.98
}
```

The metadata serves multiple purposes:

```text
Human readability
Matching
Mismatch detection
Embedding generation
Evaluation
```

---

# 7. Confidence Design

The vision model provides a confidence value.

The application defines:

```env
VISION_CONFIDENCE_THRESHOLD=0.70
```

The design rule is:

```text
confidence >= 0.70
        ↓
trusted enough for continued processing
```

while:

```text
confidence < 0.70
        ↓
flag
```

This prevents uncertain image understanding from silently entering the recommendation pipeline.

---

# 8. Article Metadata Design

Articles are represented using:

```text
subject
category
keywords
```

The article analysis process is:

```text
Title + Content
      ↓
Gemini
      ↓
Structured Metadata
      ↓
Validation
      ↓
Embedding
```

This metadata provides structured information for deterministic matching checks.

---

# 9. Embedding Design

The system generates embeddings for both:

```text
Images
Posts
```

This creates a common semantic representation.

Conceptually:

```text
Image
  ↓
Image Embedding
  │
  │
  │ semantic space
  │
  ▼
Post Embedding
  ↑
  │
Post
```

Cosine similarity measures their semantic closeness.

---

# 10. Image Embedding Input

The image embedding text is constructed from:

```text
caption
subject
category
attributes
```

Example:

```text
A red fox stands alert in grass.
Subject: red fox
Category: animal
Attributes: red fur, bushy tail, pointed ears
```

This provides more semantic information than embedding only the subject name.

---

# 11. Post Embedding Input

The post embedding text is constructed from:

```text
title
content
subject
category
keywords
```

This allows the embedding to represent both:

```text
raw article meaning
```

and:

```text
structured article metadata
```

---

# 12. Vector Database Decision

A dedicated vector database was intentionally avoided.

Reason:

```text
Small capstone dataset
        ↓
MongoDB can store arrays
        ↓
Node.js can calculate cosine similarity
        ↓
No additional vector infrastructure required
```

Advantages:

- simpler deployment
- fewer dependencies
- easier debugging
- easier explanation
- sufficient for the expected dataset size

---

# 13. Similarity Design

Cosine similarity is used:

```text
similarity =
dot(A, B) /
(||A|| × ||B||)
```

The utility validates:

```text
vector type
vector dimensions
zero vectors
```

Invalid vectors are not silently accepted.

---

# 14. Similarity Threshold

The matching system uses:

```env
SIMILARITY_THRESHOLD=0.4
```

This threshold is applied before a candidate can become a recommendation.

Example:

```text
similarity = 0.291
threshold = 0.4
```

Result:

```text
rejected
```

---

# 15. Why Similarity Threshold Alone Is Not Enough

Consider:

```text
Post:
red fox

Image:
gray wolf

Similarity:
0.3358
```

The candidate is rejected because:

```text
similarity < threshold
```

But even if a future model produced:

```text
similarity = 0.80
```

the subject could still be wrong.

Therefore:

```text
Similarity
+
Subject
+
Category
+
Confidence
```

must be considered.

---

# 16. Mismatch Guard Design

The mismatch guard is the core safety layer.

It checks:

```text
1. similarity
2. image confidence
3. subject compatibility
4. category compatibility
```

The design intentionally makes these checks deterministic.

---

# 17. Subject Compatibility

The expected post subject is compared against the detected image subject.

Example:

```text
Expected:
red fox

Detected:
gray wolf
```

Result:

```text
subject mismatch
```

Candidate:

```text
rejected
```

---

# 18. Category Compatibility

Category is also checked.

Example:

```text
Expected category:
animal

Detected category:
product
```

Result:

```text
category mismatch
```

This protects against obviously unrelated categories even when embeddings have some semantic relationship.

---

# 19. Confidence Compatibility

The candidate image must also have sufficiently reliable vision metadata.

An image with weak AI confidence should not become a recommendation merely because its embedding is close.

---

# 20. Final Candidate Decision

A candidate effectively follows:

```text
Candidate
   │
   ▼
Similarity >= threshold?
   │
   ├── No → Reject
   │
   ▼
Confidence sufficient?
   │
   ├── No → Reject
   │
   ▼
Subject compatible?
   │
   ├── No → Reject
   │
   ▼
Category compatible?
   │
   ├── No → Reject
   │
   ▼
Accept
```

This makes the final decision explainable.

---

# 21. Recommendation Decision States

The system distinguishes between:

```text
recommended
approved
manually_rejected
rejected
```

The important difference is:

```text
recommended
```

means the matching engine selected the candidate.

```text
approved
```

means a human explicitly approved it.

```text
manually_rejected
```

means a human explicitly rejected it.

---

# 22. No-Confident-Match Design

A recommendation system should not be forced to return an answer.

Therefore:

```text
All candidates rejected
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

This is considered a successful system behavior, not an application failure.

---

# 23. Why Rejection Is Important

The system is designed around:

```text
precision and safety
```

rather than:

```text
always return something
```

For image-to-article matching, an irrelevant image can be worse than no image.

Therefore:

```text
No safe recommendation
        ↓
No recommendation
```

is preferred.

---

# 24. Candidate Filtering Design

The matching engine operates on processed images.

Conceptually:

```text
All Images
    ↓
Only usable / completed images
    ↓
Embedding availability
    ↓
Candidate Set
```

This prevents incomplete or failed images from entering normal recommendation flow.

---

# 25. Forced Candidate Support

The matching API supports optional candidate filtering.

Example:

```text
GET /api/posts/:id/images?candidateImageIds=id1,id2
```

This allows:

- deterministic testing
- targeted evaluation
- controlled candidate comparisons
- easier debugging

The same mismatch guard still applies.

---

# 26. Asynchronous Processing Design

Image processing can involve:

```text
Cloudinary
Gemini Vision
Embedding generation
MongoDB updates
```

These operations can be expensive or slow.

Therefore processing is moved into asynchronous jobs.

The request path becomes:

```text
Upload
   ↓
Persist
   ↓
Create Job
   ↓
Return
```

while the worker handles:

```text
Vision
   ↓
Validation
   ↓
Embedding
   ↓
Persistence
```

---

# 27. Idempotency Design

Single-image jobs use deterministic identifiers:

```text
process_image:<imageId>
```

This prevents repeated application-level job records for the same image.

The processing service also avoids unnecessary reprocessing of already completed images where appropriate.

---

# 28. Job Tracking Design

Jobs are persisted so that processing is observable.

Tracked information includes:

```text
status
total
processed
failed
flagged
attempts
timestamps
```

This allows the API to expose processing progress.

---

# 29. Human Review Design

AI should assist rather than completely replace human decision-making.

The review workflow is:

```text
AI Recommendation
       ↓
Human Review
       ↓
Approve / Reject
       ↓
Persist Decision
```

This creates an audit trail.

---

# 30. Review History Design

Every review action is retained.

The system therefore maintains:

```text
Current Suggestion State
+
Historical Review Records
```

This is preferable to overwriting history.

---

# 31. Usage Tracking Design

Every relevant AI operation can create usage metadata.

Tracked values include:

```text
provider
model
operation
input tokens
output tokens
total tokens
estimated cost
reference
```

This makes AI consumption observable.

---

# 32. Usage Failure Isolation

Usage tracking should not become a single point of failure for AI processing.

Conceptually:

```text
AI Request
   │
   ├──────────────► Main Processing
   │
   └──────────────► Usage Recording
```

If accounting fails, the primary AI workflow should not unnecessarily fail solely because usage tracking failed.

---

# 33. API Design

The API is organized around domain resources.

```text
/images
/posts
/jobs
/usage
/suggestions
```

This keeps endpoints understandable and makes the backend easier to consume.

---

# 34. Validation Design

Input validation is performed before business logic where appropriate.

The system validates:

```text
request body
query parameters
path parameters
uploaded files
AI output
```

For MongoDB identifiers:

```text
Request
   ↓
Validate ObjectId
   ↓
Database query
```

rather than allowing a MongoDB cast exception to become a generic 500 response.

---

# 35. Error Handling Design

The system uses centralized error handling.

Expected errors are transformed into controlled HTTP responses.

Conceptually:

```text
Invalid Request
      ↓
Application Error
      ↓
Error Middleware
      ↓
Consistent HTTP Response
```

This makes API behavior more predictable.

---

# 36. Security Design

The API uses:

```text
Helmet
CORS
Rate Limiting
Validation
```

The application also avoids committing:

```text
.env
API keys
Cloudinary secrets
Gemini secrets
database credentials
```

Secrets are supplied through environment variables.

---

# 37. External Integration Design

External systems are isolated behind dedicated services/configuration.

```text
Cloudinary Service
Gemini Service
Embedding Service
Inngest Configuration
MongoDB Configuration
```

Controllers should not contain provider-specific implementation details.

---

# 38. Why Services Are Separated

Separating services makes it easier to:

```text
test
mock
debug
replace
maintain
```

For example:

```text
visionService
embeddingService
matchingService
reviewService
jobService
costTrackingService
```

each has a focused responsibility.

---

# 39. Testing Design

The testing strategy has multiple layers.

## Unit-Level

Examples:

```text
cosine similarity
schemas
guard logic
service logic
```

## API-Level

Examples:

```text
images
posts
jobs
matching
reviews
usage
health
```

## Integration / Live

Examples:

```text
MongoDB
Cloudinary
Gemini
real image processing
production API
```

---

# 40. Evaluation Design

The evaluation dataset intentionally contains both positive and negative scenarios.

```text
Positive:
red fox → red fox
gray wolf → gray wolf

Negative:
remote work → no confident match
```

This tests:

```text
retrieval
+
rejection
```

rather than retrieval alone.

---

# 41. Evaluation Metric

The primary metric is:

```text
Top-1 Precision
```

The final verified result is:

```text
3 correct / 3 cases
=
100.00%
```

The metric is intentionally simple because the capstone dataset is small.

---

# 42. Why the Remote Work Case Matters

Without a negative case, a system could achieve a high score by always returning the closest image.

The remote-work case prevents this.

Expected:

```text
remote work
      ↓
no suitable animal/product candidate
      ↓
no_confident_match
```

Actual production behavior:

```text
no_confident_match
```

Therefore the system demonstrates controlled rejection.

---

# 43. Production Design

The backend is deployed publicly through Render.

Production URL:

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

The production system uses the same application architecture:

```text
Render
  ↓
Express
  ↓
MongoDB
  ↓
Cloudinary
  ↓
Gemini
  ↓
Inngest
```

Production health and API behavior have been verified.

---

# 44. Root Route Design

The production root route redirects to the health endpoint.

```text
GET /
   ↓
Redirect
   ↓
GET /health
   ↓
{
  "status": "ok"
}
```

This provides a useful public landing point for the backend service.

---

# 45. Deployment Verification Design

Deployment is not considered successful merely because Render reports a successful build.

The deployed application was verified through actual requests.

Verification included:

```text
Public URL
Health
API responses
MongoDB-backed data
Jobs
Usage
Matching
Mismatch guard
Review workflow
Evaluation
```

Final status:

```text
LIVE VERIFIED
```

---

# 46. Important Engineering Trade-offs

## No Frontend

The capstone is intentionally backend-focused.

A frontend would add presentation complexity without being necessary to demonstrate the core AI/backend requirements.

---

## No Vector Database

The dataset is small enough for direct cosine similarity.

Introducing a vector database would increase:

```text
deployment complexity
configuration
cost
operational overhead
```

without providing meaningful benefit at this scale.

---

## Deterministic Guard Instead of Another AI Judge

The mismatch guard uses deterministic rules instead of asking another model whether the result is acceptable.

Advantages:

```text
predictable
explainable
testable
cheap
```

---

## Human Review Instead of Fully Automatic Decisions

AI recommendations can be overridden by humans.

This provides a practical human-in-the-loop architecture.

---

# 47. Known Limitations

The current design has several intentional limitations.

## Small Evaluation Dataset

Only three primary evaluation cases are used.

A production system would require a substantially larger labeled dataset.

---

## Simple Subject Compatibility

Subject matching is deterministic and intentionally conservative.

A more advanced system could support:

```text
synonyms
taxonomy
entity hierarchy
fine-grained ontology
```

---

## Direct MongoDB Vector Storage

For large-scale deployments, a dedicated vector search solution could be more appropriate.

The current approach is suitable for the capstone scale.

---

## AI Model Dependence

The quality of metadata and embeddings depends partly on the external Gemini models.

Provider outages or model behavior changes can affect results.

---

# 48. Design Principles Learned

## 1. Validate AI Output

```text
AI
 ↓
Validate
 ↓
Use
```

Never:

```text
AI
 ↓
Trust
 ↓
Persist
```

---

## 2. Separate Retrieval From Safety

```text
Similarity
```

answers:

```text
"What appears semantically close?"
```

The mismatch guard answers:

```text
"Is this candidate safe enough to recommend?"
```

---

## 3. Make Rejection Explicit

A system should be able to say:

```text
no_confident_match
```

---

## 4. Keep Decisions Explainable

Every rejection should ideally provide a reason such as:

```text
Similarity below threshold
Subject mismatch
Category mismatch
Insufficient confidence
```

---

## 5. Verify Real Integrations

Mock tests are necessary but insufficient.

The project therefore separately verifies:

```text
MongoDB
Cloudinary
Gemini
Inngest processing
Production deployment
```

---

# 49. Final Design Flow

The complete design can be summarized as:

```text
                         IMAGE
                           │
                           ▼
                     Cloudinary
                           │
                           ▼
                    Image Record
                           │
                           ▼
                    Inngest Job
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
                           ▼
                  Image Metadata
                           │
                           ▼
                  Gemini Embedding
                           │
                           ▼
                 Stored Image Vector


                         ARTICLE
                           │
                           ▼
                  Gemini Analysis
                           │
                           ▼
                    Zod Validation
                           │
                           ▼
                  Article Metadata
                           │
                           ▼
                  Gemini Embedding
                           │
                           ▼
                  Stored Post Vector


             IMAGE VECTOR + POST VECTOR
                           │
                           ▼
                  Cosine Similarity
                           │
                           ▼
                   Candidate Ranking
                           │
                           ▼
                    Mismatch Guard
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
              ACCEPT               REJECT
                 │                   │
                 ▼                   ▼
           Recommendation       Rejection Reason
                 │
                 ▼
            Human Review
                 │
          ┌──────┴──────┐
          ▼             ▼
       Approve        Reject
          │             │
          ▼             ▼
      approved    manually_rejected
```

---

# 50. Final Verified Design State

```text
AI Image Understanding       LIVE VERIFIED
Article Analysis             VERIFIED
Embedding Generation         LIVE VERIFIED
Embedding Persistence        LIVE VERIFIED
Cosine Similarity             VERIFIED
Candidate Ranking             LIVE VERIFIED
Mismatch Guard                LIVE VERIFIED
No-Confident-Match            LIVE VERIFIED
Human Review                  LIVE VERIFIED
AI Usage Tracking             LIVE VERIFIED
Async Processing              LIVE VERIFIED
MongoDB                       LIVE VERIFIED
Cloudinary                    LIVE VERIFIED
Gemini                        LIVE VERIFIED
Render Deployment             LIVE VERIFIED
Production API                LIVE VERIFIED
Production Evaluation        LIVE VERIFIED
```

Final evaluation:

```text
3/3 correct
100.00% Top-1 precision
```

Final automated verification:

```text
23/23 test suites passed
90/90 tests passed
0 lint errors
```

Final deployment status:

```text
LIVE VERIFIED
```

The design is therefore considered complete for the current capstone scope.
````