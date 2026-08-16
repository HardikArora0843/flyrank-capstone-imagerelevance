const mongoose = require('mongoose');

const env = require('./env');
const logger = require('../utils/logger');

async function connectDB(uri = env.mongodbUri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000
  });

  logger.info('mongodb_connected', {
    database: mongoose.connection.name
  });

  return mongoose.connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('mongodb_disconnected');
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
