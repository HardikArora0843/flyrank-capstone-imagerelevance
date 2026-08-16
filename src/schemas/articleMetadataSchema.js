const { z } = require('zod');

const articleMetadataSchema = z
  .object({
    subject: z.string().trim().min(1),
    category: z.string().trim().min(1),
    keywords: z.array(z.string().trim().min(1)).min(1).max(20)
  })
  .strict();

module.exports = {
  articleMetadataSchema
};
