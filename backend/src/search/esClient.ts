import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const esApiKey = process.env.ELASTICSEARCH_API_KEY;

let clientOptions: ConstructorParameters<typeof Client>[0] = { node: esUrl };

if (esApiKey) {
  clientOptions = { ...clientOptions, auth: { apiKey: esApiKey } };
}

export const esClient = new Client(clientOptions);

export const ES_INDEX = 'trustguard_sellers';

// Ping Elasticsearch on startup (non-fatal if unavailable in dev)
esClient.ping().then(() => {
  logger.info('Elasticsearch connection established');
}).catch(() => {
  logger.warn('Elasticsearch not reachable — search will fall back to Supabase');
});
