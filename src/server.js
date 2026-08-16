require('dotenv').config();

const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utils/logger');

const port = env.port;

let server;

async function startServer() {
  try {
    await connectDB();

    server = app.listen(port, () => {
      logger.info('server_started', { port });
    });
  } catch (error) {
    logger.error('server_start_failed', {
      message: error.message,
      name: error.name
    });

    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  logger.info('server_stopping', { signal });

  if (server) {
    server.close(async () => {
      await disconnectDB();
      logger.info('server_stopped');
    });
  } else {
    await disconnectDB();
  }
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

startServer();