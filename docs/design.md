# Design

## Problem

The system must understand an image library, classify images into structured metadata, match images to blog posts, and reject weak or incorrect matches instead of guessing.

The core demonstration is:
- A red fox post ranks a red fox image first.
- A wolf image is rejected when considered for the fox post.
- If no candidate is strong enough, the API returns `no_confident_match` with reasons.

## Non-Goals

- No frontend.
- No Docker.
- No PostgreSQL.
- No separate vector database.
- No paid infrastructure beyond the required external APIs.
- No authentication system unless the capstone requirements change.

## Main Components

- Express REST API for image, post, matching, review, job, usage, and evaluation endpoints.
- MongoDB Atlas for persistence.
- Cloudinary for image file storage.
- Gemini Vision for image metadata extraction.
- Gemini embeddings for image and post semantic vectors.
- Inngest for asynchronous image processing.
- Zod for strict request and AI-output validation.
- Backend cosine similarity for ranking.
- Mismatch guard for safe acceptance or rejection.

## Decision Flow

1. Image is uploaded through the API.
2. API stores the file in Cloudinary.
3. API creates an `Image` record with `pending` status.
4. Inngest processes the image asynchronously.
5. Gemini Vision returns structured metadata.
6. Zod validates the metadata.
7. Low-confidence metadata is flagged.
8. Valid image metadata is embedded and stored.
9. Posts are analyzed and embedded.
10. Matching calculates cosine similarity between a post and candidate images.
11. The mismatch guard checks similarity, confidence, subject compatibility, and category compatibility.
12. The API returns accepted suggestions or a clear `no_confident_match` response.

## Thresholds

Thresholds are environment-driven:
- `VISION_CONFIDENCE_THRESHOLD`
- `SIMILARITY_THRESHOLD`

They must be read from configuration and not scattered across business logic.

## AI Output Trust Boundary

Gemini Vision and article analysis output are treated as untrusted external data. The services:
- asks for strict JSON
- parses only the returned text
- validates with a strict Zod schema
- retries malformed output
- fails safely after retry exhaustion
- flags low-confidence valid metadata instead of accepting it as completed

## Dataset

The initial evaluation dataset will contain labeled post-to-image examples, including:
- red fox post to red fox image
- red fox post against wolf image as a rejection probe
- unrelated post with no suitable image

The measured Top-1 precision will be written only after `npm run evaluate` is implemented and executed.

## Embedding Strategy

Images are embedded from:
- caption
- subject
- category
- visible attributes

Posts are embedded from:
- title
- content
- structured subject/category
- keywords

Embeddings are stored as numeric arrays in MongoDB documents. Matching will use backend cosine similarity instead of a vector database.

## Mismatch Guard

The matching engine ranks candidates by cosine similarity, then the mismatch guard decides whether each candidate is safe to recommend.

Guard checks:
- similarity threshold
- image vision confidence threshold
- subject compatibility
- category compatibility

A wolf image can be semantically near a fox article, but it still fails the subject check because the detected subject `gray wolf` does not share the important subject token `fox`.
