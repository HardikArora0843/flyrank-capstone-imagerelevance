const { z } = require('zod');

const imageListQuerySchema = z.object({
  processingStatus: z
    .enum(['pending', 'processing', 'completed', 'flagged', 'failed'])
    .optional()
});

const jobListQuerySchema = z.object({
  status: z
    .enum(['pending', 'processing', 'completed', 'completed_with_errors', 'failed'])
    .optional()
});

const usageQuerySchema = z.object({
  operation: z.enum(['vision', 'embedding', 'article_analysis']).optional(),
  imageId: z.string().trim().min(1).optional(),
  postId: z.string().trim().min(1).optional()
});

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1)
});

const updatePostSchema = createPostSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field is required'
  }
);

const matchingQuerySchema = z.object({
  candidateImageIds: z
    .preprocess((value) => {
      if (value === undefined) {
        return undefined;
      }

      if (Array.isArray(value)) {
        return value;
      }

      return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }, z.array(z.string().trim().min(1)).optional())
});

const createReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().min(1).max(1000),
  reviewer: z.string().trim().min(1).max(120).optional()
});

module.exports = {
  createReviewSchema,
  createPostSchema,
  imageListQuerySchema,
  jobListQuerySchema,
  matchingQuerySchema,
  updatePostSchema,
  usageQuerySchema
};
