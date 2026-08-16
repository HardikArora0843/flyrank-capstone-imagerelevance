const { AIUsage, Image, Job, Post, Suggestion } = require('../../src/models');

function indexFields(model) {
  return model.schema.indexes().map(([fields]) => Object.keys(fields).join(','));
}

describe('Mongoose indexes', () => {
  it('defines required Image indexes', () => {
    expect(indexFields(Image)).toEqual(
      expect.arrayContaining([
        'cloudinaryPublicId',
        'subject',
        'category',
        'processingStatus'
      ])
    );
  });

  it('defines required Post indexes', () => {
    expect(indexFields(Post)).toEqual(
      expect.arrayContaining(['subject', 'category'])
    );
  });

  it('defines required Suggestion indexes', () => {
    expect(indexFields(Suggestion)).toEqual(
      expect.arrayContaining(['postId', 'imageId', 'guardStatus'])
    );
  });

  it('defines required Job and AIUsage indexes', () => {
    expect(indexFields(Job)).toEqual(expect.arrayContaining(['jobId', 'status']));
    expect(indexFields(AIUsage)).toEqual(expect.arrayContaining(['operation']));
  });
});
