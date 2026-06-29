import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      autoIndex: env.NODE_ENV !== 'production',
    });
    logger.info(`📦 MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection error', err);
    process.exit(1);
  }
};
