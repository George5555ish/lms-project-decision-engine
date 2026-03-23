import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  if (!config.mongoUri) {
    throw new Error('Mongo URI not configured for decision-engine.');
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName
  });
}

