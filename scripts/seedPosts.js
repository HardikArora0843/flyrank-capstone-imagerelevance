const { connectDB, disconnectDB } = require('../src/config/db');
const Post = require('../src/models/Post');
const postService = require('../src/services/postService');
const logger = require('../src/utils/logger');

const DEMO_POSTS = [
  {
    title: 'The Behavior of Red Foxes',
    content:
      'Red foxes are adaptable mammals found across many habitats. Their behavior includes hunting small animals, marking territory, raising kits, and adapting their activity patterns to local conditions. Understanding red fox behavior helps explain how these animals survive in forests, grasslands, and areas close to human settlements.'
  },
  {
    title: 'Understanding Gray Wolves',
    content:
      'Gray wolves are social carnivores that live in organized packs. Their behavior includes cooperative hunting, communication through vocalizations, territorial behavior, and caring for young. Wolves play an important ecological role because their presence can influence populations and behavior of other animals in their habitat.'
  },
  {
    title: 'Best Practices for Remote Work',
    content:
      'Remote work requires good communication, time management, and an organized workspace. Teams can improve productivity by setting clear goals, maintaining reliable communication channels, documenting important decisions, and creating healthy boundaries between working hours and personal time.'
  }
];

async function seedPost(postData) {
  const existing = await Post.findOne({
    title: postData.title
  });

  if (existing) {
    logger.info('seed_post_exists', {
      postId: existing._id.toString(),
      title: existing.title
    });

    return existing;
  }

  logger.info('seed_post_creation_started', {
    title: postData.title
  });

  const post = await postService.createPost(postData);

  logger.info('seed_post_created', {
    postId: post._id.toString(),
    title: post.title,
    subject: post.subject,
    category: post.category
  });

  return post;
}

async function main() {
  try {
    await connectDB();

    const results = [];

    for (const postData of DEMO_POSTS) {
      const post = await seedPost(postData);

      results.push({
        title: post.title,
        postId: post._id.toString(),
        subject: post.subject || null,
        category: post.category || null,
        keywords: post.keywords || [],
        hasEmbedding: Array.isArray(post.embedding) && post.embedding.length > 0
      });
    }

    console.log('\nDemo posts seeded successfully:\n');

    console.table(results);
  } catch (error) {
    logger.error('seed_posts_failed', {
      message: error.message
    });

    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

main();