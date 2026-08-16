# Evaluation Dataset

This directory contains the evaluation dataset used to measure the image relevance and auto-tagging system.

The dataset is intentionally small and deterministic because the capstone focuses on demonstrating the complete backend pipeline:

```text
Image Understanding
        ↓
Metadata Extraction
        ↓
Embedding Generation
        ↓
Semantic Matching
        ↓
Mismatch Guard
        ↓
Recommendation / Rejection
        ↓
Evaluation
```

The evaluation is designed to test both:

1. whether the system can find the correct image
2. whether the system can correctly reject an incorrect image

---

# Dataset Purpose

The evaluation dataset verifies that the matching engine can distinguish between:

```text
correct semantic matches
```

and:

```text
semantically weak or subject-incompatible images
```

The dataset contains three primary evaluation scenarios:

```text
1. Red fox article → red fox image
2. Gray wolf article → gray wolf image
3. Remote work article → no confident image match
```

The third case is especially important because the system must not force a recommendation when no candidate is sufficiently relevant.

---

# Dataset Structure

```text
dataset/
├── README.md
├── evaluation.json
└── images/
    ├── red-fox.jpg
    ├── gray-wolf.jpg
    ├── dog.jpg
    └── unrelated.jpg
```

---

# Evaluation Cases

## Case 1 — Red Fox

### Article

```text
The Behavior of Red Foxes
```

The article describes red fox behavior and characteristics.

Expected image:

```text
red-fox.jpg
```

Expected subject:

```text
red fox
```

Expected category:

```text
animal
```

Expected result:

```text
matched
```

Expected decision:

```text
recommended
```

---

## Case 2 — Gray Wolf

### Article

```text
Understanding Gray Wolves
```

The article describes gray wolves and their characteristics.

Expected image:

```text
gray-wolf.jpg
```

Expected subject:

```text
gray wolf
```

Expected category:

```text
animal
```

Expected result:

```text
matched
```

Expected decision:

```text
recommended
```

---

## Case 3 — Remote Work

### Article

```text
Best Practices for Remote Work
```

The article is about remote work and business practices.

Expected image:

```text
none
```

Expected subject:

```text
remote work
```

Expected category:

```text
business
```

Because the available candidate images are animals or unrelated products, the system should not force a recommendation.

Expected result:

```text
no_confident_match
```

Expected suggestions:

```json
[]
```

This case verifies the rejection behavior of the matching engine.

---

# Evaluation Images

The dataset contains the following image types.

| Image | Intended Subject | Category | Evaluation Purpose |
|---|---|---|---|
| `red-fox.jpg` | Red fox | Animal | Correct red fox match |
| `gray-wolf.jpg` | Gray wolf | Animal | Correct gray wolf match |
| `dog.jpg` | Golden retriever | Animal | Incorrect animal candidate |
| `unrelated.jpg` | ASUS TUF gaming laptop | Product | Category and subject mismatch |

The database also contains additional processed images generated during live testing.

---

# Expected Matching Behavior

The matching engine should not simply select the image with the highest cosine similarity.

The complete decision process is:

```text
Post
  ↓
Post Embedding
  ↓
Candidate Image Embeddings
  ↓
Cosine Similarity
  ↓
Candidate Ranking
  ↓
Mismatch Guard
  ↓
Accept / Reject
```

The mismatch guard checks:

```text
Similarity
Image Confidence
Subject Compatibility
Category Compatibility
```

Therefore:

```text
High similarity
      +
Incorrect subject
      ↓
REJECT
```

and:

```text
Low similarity
      ↓
REJECT
```

If no candidate passes the required checks:

```text
no_confident_match
```

is returned.

---

# Evaluation Dataset Generation

The evaluation dataset can be generated from the configured MongoDB environment.

Run:

```bash
npm run seed:evaluation
```

The script:

1. connects to MongoDB
2. locates the required posts
3. locates the required processed images
4. constructs the evaluation cases
5. writes the evaluation dataset

The generated file is:

```text
dataset/evaluation.json
```

---

# Running the Evaluation

Run:

```bash
npm run evaluate
```

The evaluator uses the real MongoDB-backed application data.

The evaluation is therefore based on:

```text
real persisted posts
real persisted images
real persisted embeddings
real matching logic
real mismatch guard
real suggestion decisions
```

It does not rely exclusively on mocked matching behavior.

---

# Evaluation Metric

The primary metric is:

```text
Top-1 Precision
```

The evaluator checks whether the highest-ranked accepted result matches the expected result.

For cases where the expected result is no match, the evaluator checks whether the system correctly returns:

```text
no_confident_match
```

---

# Evaluation Formula

For the three-case dataset:

```text
Top-1 Precision =
Correct Evaluation Cases / Total Evaluation Cases
```

The final verified evaluation was:

```text
Correct Evaluation Cases:
3

Total Evaluation Cases:
3

Top-1 Precision:
100.00%
```

---

# Verified Evaluation Result

The final evaluation produced:

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

---

# Case-by-Case Results

## Red Fox

```text
Article:
The Behavior of Red Foxes

Expected:
red fox image

Actual:
red fox image

Result:
CORRECT
```

Observed production similarity:

```text
0.42131531009290035
```

The candidate was accepted because:

```text
Strong semantic similarity
Subject match
Category match
Sufficient image confidence
```

---

## Gray Wolf

```text
Article:
Understanding Gray Wolves

Expected:
gray wolf image

Actual:
gray wolf image

Result:
CORRECT
```

Observed production similarity:

```text
0.42640793873841476
```

The candidate was accepted because:

```text
Strong semantic similarity
Subject match
Category match
Sufficient image confidence
```

---

## Remote Work

```text
Article:
Best Practices for Remote Work

Expected:
no image

Actual:
no confident match

Result:
CORRECT
```

The strongest available candidate had:

```text
similarity:
0.2912505493332135
```

The configured similarity threshold was:

```text
0.4
```

The candidate was rejected.

Additional mismatch reasons included:

```text
Subject mismatch:
expected remote work,
detected golden retriever

Category mismatch:
expected business,
detected animal
```

Final result:

```json
{
  "status": "no_confident_match",
  "suggestions": []
}
```

---

# Incorrect Candidate Rejection

The evaluation also demonstrates that incorrect candidates are explicitly rejected.

For the red fox article, the gray wolf candidate produced:

```text
similarity:
0.3358349472638014
```

Configured threshold:

```text
0.4
```

Result:

```text
rejected
```

Reasons:

```text
Similarity 0.336 is below threshold 0.4
Subject mismatch: expected red fox, detected gray wolf
```

This demonstrates the importance of the mismatch guard.

---

# Production Verification

The same matching behavior was verified against the deployed application.

Production URL:

```text
https://flyrank-capstone-imagerelevance.onrender.com
```

Production verification covered:

```text
Red fox → red fox
Gray wolf → gray wolf
Remote work → no confident match
```

Final production result:

```text
3/3 correct
100.00% Top-1 precision
```

Production status:

```text
LIVE VERIFIED
```

---

# Production Matching Evidence

## Red Fox

Production endpoint:

```http
GET /api/posts/6a80f2b302dea112cbd4e4ab/images
```

Result:

```text
status:
matched
```

Accepted image:

```text
red fox
```

Similarity:

```text
0.42131531009290035
```

---

## Gray Wolf

Production endpoint:

```http
GET /api/posts/6a80f2b802dea112cbd4e4ad/images
```

Result:

```text
status:
matched
```

Accepted image:

```text
gray wolf
```

Similarity:

```text
0.42640793873841476
```

---

## Remote Work

Production endpoint:

```http
GET /api/posts/6a80f2bb02dea112cbd4e4af/images
```

Result:

```text
status:
no_confident_match
```

Suggestions:

```json
[]
```

Result:

```text
CORRECT
```

---

# Why the Dataset Includes Negative Cases

A recommendation system should not only be evaluated on its ability to retrieve relevant content.

It must also demonstrate that it can refuse incorrect content.

A weak system might behave like:

```text
Article
  ↓
Find highest similarity
  ↓
Always recommend something
```

This project instead implements:

```text
Article
  ↓
Find candidates
  ↓
Rank candidates
  ↓
Apply deterministic mismatch guard
  ↓
Reject unsafe candidates
  ↓
Return no_confident_match when necessary
```

The remote-work case exists specifically to test this behavior.

---

# Dataset Design Principles

## 1. Small and deterministic

The dataset is intentionally small enough to run quickly and reproduce consistently.

---

## 2. Includes positive examples

Positive cases:

```text
red fox → red fox
gray wolf → gray wolf
```

---

## 3. Includes negative examples

Negative cases include:

```text
red fox → gray wolf
red fox → golden retriever
red fox → gaming laptop
remote work → animal
```

---

## 4. Tests semantic similarity and deterministic guards

The dataset is designed so that the matching engine must consider more than embeddings.

The final decision depends on:

```text
semantic similarity
+
subject compatibility
+
category compatibility
+
vision confidence
```

---

## 5. Tests rejection behavior

The dataset explicitly verifies:

```text
no_confident_match
```

instead of requiring the system to always return an image.

---

# Relationship With MongoDB

The evaluation dataset is not intended to replace the application's MongoDB records.

Instead:

```text
MongoDB
   ↓
Persisted Posts
   ↓
Persisted Images
   ↓
Persisted Embeddings
   ↓
Evaluation
```

The evaluation script uses the actual application data.

This makes the evaluation representative of the real backend workflow.

---

# Relationship With Cloudinary

Image files are stored in Cloudinary during application execution.

MongoDB stores references such as:

```text
cloudinaryUrl
cloudinaryPublicId
```

The evaluation therefore works with the application's normal image-storage architecture rather than introducing a separate image-loading system.

---

# Relationship With Gemini

Gemini is used for:

```text
Image Vision Analysis
Article Analysis
Embeddings
```

The resulting structured metadata and embeddings are persisted in MongoDB.

The evaluation consumes those persisted outputs through the matching engine.

---

# Reproducibility

To reproduce the evaluation locally:

```bash
npm install
```

Configure:

```text
.env
```

with the required:

```text
MONGODB_URI
CLOUDINARY_* 
GEMINI_*
```

Then run:

```bash
npm run seed:evaluation
npm run evaluate
```

The evaluation should use the same application services and matching logic as the running backend.

---

# Expected Final Result

A successful evaluation should produce:

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

The expected logical results are:

```text
Red fox article
    ↓
Red fox image
    ↓
CORRECT

Gray wolf article
    ↓
Gray wolf image
    ↓
CORRECT

Remote work article
    ↓
No confident image
    ↓
CORRECT
```

---

# Final Dataset Status

```text
Dataset:
READY

Evaluation Dataset:
PASS

Evaluation Script:
PASS

Evaluation Cases:
3

Correct Cases:
3

Top-1 Precision:
100.00%

Negative Match Testing:
PASS

No-Confident-Match Testing:
PASS

Production Evaluation:
LIVE VERIFIED
```

The dataset successfully demonstrates both sides of the image relevance problem:

```text
Find the right image
```

and:

```text
Refuse the wrong image
```

Final status:

```text
EVALUATION COMPLETE
```
```