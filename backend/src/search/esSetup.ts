/**
 * Run once to create the Elasticsearch index with proper mappings.
 * Usage: npm run es:setup
 *
 * Features:
 * - Edge n-gram for partial business name matching
 * - Fuzzy-ready text fields for social media / TikTok handles
 * - cluster_id keyword for Scammer Graph grouping
 * - watchlist_flag boolean for zero-match watchlist
 */
import { esClient, ES_INDEX } from './esClient';
import { logger } from '../utils/logger';

async function setupIndex() {
  const exists = await esClient.indices.exists({ index: ES_INDEX });

  if (exists) {
    logger.info(`Index "${ES_INDEX}" already exists. Updating mappings...`);
    // Add new fields to existing index without recreating
    await esClient.indices.putMapping({
      index: ES_INDEX,
      body: {
        properties: {
          cluster_id:          { type: 'keyword' },
          tiktok_handle:       { type: 'text', analyzer: 'handle_analyzer', fields: { keyword: { type: 'keyword' } } },
          watchlist_flag:      { type: 'boolean' },
          watchlist_searches:  { type: 'integer' },
        },
      },
    });
    logger.info('ES mappings updated.');
    return;
  }

  await esClient.indices.create({
    index: ES_INDEX,
    body: {
      settings: {
        number_of_shards:   1,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            // For business names: partial matching
            business_name_analyzer: {
              type:      'custom',
              tokenizer: 'standard',
              filter:    ['lowercase', 'asciifolding', 'edge_ngram_filter'],
            },
            // For social/TikTok handles: lowercase + char filter to strip @
            handle_analyzer: {
              type:       'custom',
              tokenizer:  'standard',
              char_filter: ['at_sign_filter'],
              filter:     ['lowercase', 'asciifolding'],
            },
          },
          char_filter: {
            at_sign_filter: {
              type:        'pattern_replace',
              pattern:     '@',
              replacement: '',
            },
          },
          filter: {
            edge_ngram_filter: {
              type:     'edge_ngram',
              min_gram: 2,
              max_gram: 20,
            },
          },
        },
      },
      mappings: {
        properties: {
          id:                  { type: 'keyword' },
          cluster_id:          { type: 'keyword' },          // Scammer Graph
          business_name:       {
            type:            'text',
            analyzer:        'business_name_analyzer',
            search_analyzer: 'standard',
            fields: { keyword: { type: 'keyword' } },
          },
          phone_number:        { type: 'keyword' },
          till_number:         { type: 'keyword' },
          paybill_number:      { type: 'keyword' },
          tiktok_handle:       {                             // TikTok fuzzy search
            type:     'text',
            analyzer: 'handle_analyzer',
            fields:   { keyword: { type: 'keyword' } },
          },
          social_media_handle: {                             // Social fuzzy search
            type:     'text',
            analyzer: 'handle_analyzer',
            fields:   { keyword: { type: 'keyword' } },
          },
          website_url:         { type: 'keyword' },
          location:            { type: 'text' },
          trust_score:         { type: 'integer' },
          status:              { type: 'keyword' },
          total_reports:       { type: 'integer' },
          is_verified:         { type: 'boolean' },
          watchlist_flag:      { type: 'boolean' },          // Watchlist
          watchlist_searches:  { type: 'integer' },
          created_at:          { type: 'date' },
        },
      },
    },
  });

  logger.info(`Elasticsearch index "${ES_INDEX}" created with full mappings.`);
}

setupIndex().catch((err) => {
  logger.error('ES setup failed:', err);
  process.exit(1);
});
