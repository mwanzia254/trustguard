import { esClient, ES_INDEX } from './esClient';
import { supabase } from '../database/supabase';
import { logger } from '../utils/logger';

export interface SellerDoc {
  id: string;
  cluster_id?: string;             // Scammer Graph cluster
  business_name?: string;
  phone_number?: string;
  till_number?: string;
  paybill_number?: string;
  tiktok_handle?: string;
  social_media_handle?: string;
  website_url?: string;
  location?: string;
  trust_score: number;
  status: string;
  total_reports: number;
  is_verified: boolean;
  watchlist_flag?: boolean;
  watchlist_searches?: number;
  created_at: string;
}

export const sellerIndexer = {
  /**
   * Index or replace a single seller document in Elasticsearch.
   */
  async indexSeller(seller: SellerDoc) {
    try {
      await esClient.index({
        index: ES_INDEX,
        id: seller.id,
        document: seller,
      });
    } catch (err) {
      logger.warn('ES indexSeller failed (non-fatal):', err);
    }
  },

  /**
   * Partially update a seller document (e.g. trust score after recalculation).
   */
  async updateSeller(sellerId: string, fields: Partial<SellerDoc>) {
    try {
      await esClient.update({
        index: ES_INDEX,
        id: sellerId,
        doc: fields,
        doc_as_upsert: true,
      });
    } catch (err) {
      logger.warn('ES updateSeller failed (non-fatal):', err);
    }
  },

  /**
   * Delete a seller document.
   */
  async deleteSeller(sellerId: string) {
    try {
      await esClient.delete({ index: ES_INDEX, id: sellerId });
    } catch (err) {
      logger.warn('ES deleteSeller failed (non-fatal):', err);
    }
  },

  /**
   * Bulk re-index all sellers from Supabase into Elasticsearch.
   * Run once on initial setup: npm run es:index
   */
  async reindexAll() {
    let page = 0;
    const pageSize = 500;
    let total = 0;

    logger.info('Starting bulk re-index of sellers...');

    while (true) {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        logger.error('Supabase fetch error during reindex:', error);
        break;
      }
      if (!data || data.length === 0) break;

      const operations = data.flatMap((seller) => [
        { index: { _index: ES_INDEX, _id: seller.id } },
        seller,
      ]);

      const { errors } = await esClient.bulk({ operations });
      if (errors) logger.warn('Some ES bulk operations had errors');

      total += data.length;
      logger.info(`Indexed ${total} sellers so far...`);
      page++;
    }

    logger.info(`Re-index complete. Total sellers indexed: ${total}`);
  },
};

// Allow running directly: npm run es:index
if (require.main === module) {
  sellerIndexer.reindexAll().catch(console.error);
}
