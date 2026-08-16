Next is **`dataset/README.md`**.

Replace the entire file with this:

```markdown
# Evaluation Dataset

This directory contains the labeled examples used to evaluate the image-to-post matching engine.

The evaluation dataset is intentionally small and focused on the core safety and relevance requirements of the capstone.

---

## Purpose

The evaluation verifies that the matching system can:

1. Match an article about a red fox with a red fox image.
2. Match an article about a gray wolf with a gray wolf image.
3. Avoid recommending an unrelated animal image for a remote-work article.
4. Return `no_confident_match` when no candidate passes the mismatch guard.
5. Rank the correct image as the Top-1 candidate when a valid match exists.

---

## Dataset Structure

```text
dataset/
├── README.md
├── evaluation.json
└── images/
    ├── dog.jpg
    ├── gray-wolf.jpg
    ├── red-fox.jpg
    └── unrelated.jpg
```

---

## Evaluation Cases

The current evaluation contains three labeled post-to-image cases.

### Case 1: Red Fox

```text
Post:
The Behavior of Red Foxes

Expected:
red-fox.jpg
```

The matching engine should identify the red fox image as the Top-1 accepted recommendation.

---

### Case 2: Gray Wolf

```text
Post:
Understanding Gray Wolves

Expected:
gray-wolf.jpg
```

The matching engine should identify the gray wolf image as the Top-1 accepted recommendation.

---

### Case 3: Unrelated Content

```text
Post:
Best Practices for Remote Work

Expected:
none
```

The matching engine should not recommend an animal image and should return:

```text
no_confident_match
```

This case verifies that the system can safely reject irrelevant candidates instead of returning the highest-scoring image regardless of actual relevance.

---

# Evaluation Dataset File

The generated labels are stored in:

```text
dataset/evaluation.json
```

Example structure:

```json
[
  {
    "name": "red fox article should match red fox image",
    "postId": "<post-id>",
    "expectedImageId": "<red-fox-image-id>"
  },
  {
    "name": "gray wolf article should match gray wolf image",
    "postId": "<post-id>",
    "expectedImageId": "<gray-wolf-image-id>"
  },
  {
    "name": "remote work article should have no confident animal image match",
    "postId": "<post-id>",
    "expectedImageId": null
  }
]
```

The IDs are generated from the actual MongoDB records rather than being manually hard-coded.

---

# Dataset Generation

The evaluation dataset can be generated from the currently seeded MongoDB data using:

```bash
npm run seed:evaluation
```

The script:

1. Connects to MongoDB.
2. Finds the required evaluation posts.
3. Finds the expected image records.
4. Verifies that expected images have completed processing.
5. Verifies that expected images contain embeddings.
6. Writes the resulting MongoDB IDs to `dataset/evaluation.json`.

The script is implemented in:

```text
scripts/seedEvaluation.js
```

---

# Running the Evaluation

After the dataset has been generated, run:

```bash
npm run evaluate
```

The evaluation runner is implemented in:

```text
scripts/evaluate.js
```

It executes the actual matching service against every evaluation case.

---

# Evaluation Method

For every test case:

```text
Evaluation Case
      ↓
Load Post
      ↓
Generate/use Post Embedding
      ↓
Load Completed Image Candidates
      ↓
Calculate Cosine Similarity
      ↓
Rank Candidates
      ↓
Run Mismatch Guard
      ↓
Persist Suggestions
      ↓
Determine Top-1 Result
      ↓
Compare Against Expected Image
```

The evaluation checks the actual backend matching behavior rather than using mocked results.

---

# Top-1 Precision

The evaluation calculates:

```text
Top-1 Precision =
Correct Top-1 Results / Total Evaluation Cases
```

For the current dataset:

```text
Evaluation cases:       3
Correct Top-1 results:  3
Incorrect results:      0

Top-1 precision:        100.00%
```

---

# Verified Evaluation Results

The current live evaluation produced:

```text
1. red fox article should match red fox image
   Expected: red fox image
   Actual:   red fox image
   Result:   CORRECT
   Similarity: 0.4213

2. gray wolf article should match gray wolf image
   Expected: gray wolf image
   Actual:   gray wolf image
   Result:   CORRECT
   Similarity: 0.4264

3. remote work article should have no confident animal image match
   Expected: none
   Actual:   none
   Status:   no_confident_match
   Result:   CORRECT
```

Final result:

```text
Posts evaluated: 3
Correct top-1 matches: 3
Top-1 precision: 100.00%
```

---

# Why the Dataset Includes an Unrelated Case

A matching system should not always return an image.

For example:

```text
Post:
Best Practices for Remote Work

Available images:
- red fox
- gray wolf
- dog
- unrelated image
```

Even if one image has the highest cosine similarity, it should not automatically be recommended.

The mismatch guard evaluates additional signals:

```text
Similarity
Vision confidence
Subject compatibility
Category compatibility
```

If no candidate passes these checks, the system returns:

```text
no_confident_match
```

This demonstrates the project's primary safety requirement:

> Do not force an image recommendation when the available candidates are not sufficiently relevant.

---

# Red Fox vs Gray Wolf Rejection

The dataset and matching tests also support the core mismatch scenario:

```text
Red Fox article
        ↓
Gray Wolf candidate
        ↓
Similarity ranking
        ↓
Mismatch Guard
        ↓
Rejected
```

The wolf image can have meaningful semantic similarity to an article about foxes because both are animals.

However, semantic similarity alone is insufficient.

The subject compatibility check detects that:

```text
Post subject:
fox

Image subject:
gray wolf
```

and rejects the candidate.

---

# Image Files

The dataset currently contains:

### `red-fox.jpg`

Used as the expected positive match for the red fox article.

### `gray-wolf.jpg`

Used as the expected positive match for the gray wolf article and as an important rejection candidate for the red fox scenario.

### `dog.jpg`

Provides an additional animal candidate for ranking and guard evaluation.

### `unrelated.jpg`

Provides a non-animal/unrelated candidate for testing candidate rejection behavior.

---

# Important Dataset Rule

The evaluation dataset should contain real labeled examples.

Do not modify `evaluation.json` merely to make the evaluation score higher.

The purpose of the evaluation is to measure the actual behavior of the matching engine.

If the matching logic changes, the evaluation should be rerun and the resulting metrics should be recorded honestly.

---

# Adding More Evaluation Cases

Additional cases can be added to:

```text
scripts/seedEvaluation.js
```

For example:

```javascript
{
  name: 'article description',
  postTitle: 'Example Article',
  expectedImageFilename: 'example.jpg'
}
```

For a case where no image should be recommended:

```javascript
{
  name: 'unrelated article should have no confident image match',
  postTitle: 'Example Unrelated Article',
  expectedImageFilename: null
}
```

After modifying the evaluation cases:

```bash
npm run seed:evaluation
npm run evaluate
```

---

# Recommended Future Dataset Expansion

For a production-quality evaluation, the dataset should eventually include more examples covering:

```text
Positive matches
Negative matches
Low-confidence images
Category mismatches
Subject mismatches
Visually similar but semantically incorrect images
Unrelated articles
Multiple valid candidate images
No available candidates
```

A larger evaluation set would provide a more reliable estimate of matching quality than the current three-case demonstration dataset.

---

# Current Dataset Status

```text
Dataset generation:        COMPLETE
Evaluation runner:         COMPLETE
MongoDB-backed labels:     VERIFIED
Live matching evaluation:  VERIFIED
Evaluation cases:          3
Correct cases:              3
Top-1 precision:            100.00%
```

The current dataset successfully demonstrates the core capstone requirement:

```text
Relevant image
      ↓
Correct recommendation

Incorrect image
      ↓
Mismatch guard
      ↓
Safe rejection

No suitable image
      ↓
no_confident_match
```