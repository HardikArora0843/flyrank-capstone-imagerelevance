const { z } = require('zod');

const imageMetadataSchema = z
  .object({
    subject: z.string().trim().min(1),
    category: z.string().trim().min(1),
    attributes: z.array(z.string().trim().min(1)).min(1),
    caption: z.string().trim().min(1),
    confidence: z.number().min(0).max(1)
  })
  .strict();

module.exports = {
  imageMetadataSchema
};
