import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: Number(process.env.DECISION_ENGINE_PORT || process.env.PORT || 4000),
  mongoUri: process.env.DECISION_ENGINE_MONGO_URI || process.env.MONGODB_URI || '',
  mongoDbName: process.env.DECISION_ENGINE_DB_NAME || process.env.MONGODB_DB_NAME || 'decisionEngineDB'
};

if (!config.mongoUri) {
  // We log but do not throw here so tests can stub connection.
  // The server startup will fail fast if no URI is available.
  // eslint-disable-next-line no-console
  console.warn('[decision-engine] MONGO URI not set. Set DECISION_ENGINE_MONGO_URI or MONGODB_URI in .env');
}

