require('dotenv').config();

const { connectDB, disconnectDB } = require('../src/config/db');
const logger = require('../src/utils/logger');
const models = require('../src/models');

async function initializeIndexes() {
  await connectDB();

  const modelEntries = Object.entries(models);
  for (const [name, model] of modelEntries) {
    await model.syncIndexes();
    logger.info('indexes_synced', { model: name });
  }

  await disconnectDB();
}

initializeIndexes().catch(async (error) => {
  logger.error('migration_failed', { message: error.message });
  await disconnectDB();
  process.exitCode = 1;
});
