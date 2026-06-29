import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION 💥', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION 💥', err);
  server.close(() => process.exit(1));
});

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () =>
    logger.info(`🚀 BlogSphere API running on :${PORT} [${process.env.NODE_ENV}]`)
  );
};

start();
