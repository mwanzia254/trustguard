import { esClient, ES_INDEX } from './esClient';
import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

type SearchType = 'phone' | 'till_number' | 'paybill' | 'business_name' | 'tiktok' | 'social_media' | 'website';

// Threshold: if a zero-match term is searched this many times in 24h, flag it
const WATCHLIST_FLAG_THRESHOLD = 20;

export const searchService = {
  async search(value: string, type: SearchType, userId?: string, ipAddress?: string) {
    if (!value || value.trim().length < 2) {
      throw createError('Search value must be at least 2 characters', 400);
    }

    const cleanValue = value.trim().toLowerCase().replace(/^@/, ''); // normalise handles
    let sellers: Record<string, unknown>[] = [];
    let clusterSellers: Record<string, unknown>[] = [];
    let watchlistEntry: Record<string, unknown> | null = null;

    try {
      // ── Primary: Elasticsearch ────────────────────────────────────────────
      sellers = await searchWithElasticsearch(cleanValue, type);
    } catch (esErr) {
      // ── Fallback: Supabase SQL ─────────────────────────────────────────────
      logger.warn('ES search failed, falling back to Supabase:', esErr);
      sellers = await searchWithSupabase(cleanValue, type);
    }

    const found = sellers.length > 0;
    const enriched = sellers.map(enrichSeller);

    // ── Feature 1: Scammer Graph ─────────────────────────────────────────────
    // If we found sellers, check if any belong to a cluster and fetch siblings
    if (found) {
      const clusterIds = [
        ...new Set(enriched.map((s: any) => s.cluster_id).filter(Boolean)),
      ];

      if (clusterIds.length > 0) {
        try {
          // Find all other sellers in the same cluster(s)
          const clusterResponse = await esClient.search({
            index: ES_INDEX,
            body: {
              query: { terms: { cluster_id: clusterIds } },
              size: 20,
            },
          });

          // Exclude already-found sellers
          const foundIds = new Set(enriched.map((s: any) => s.id));
          clusterSellers = clusterResponse.hits.hits
            .map((h: any) => ({ ...h._source }))
            .filter((s: any) => !foundIds.has(s.id))
            .map(enrichSeller);
        } catch {
          // ES unavailable — try Supabase fallback for cluster
          if (clusterIds.length > 0) {
            const { data } = await supabase
              .from('sellers')
              .select('*')
              .in('cluster_id', clusterIds)
              .limit(10);
            const foundIds = new Set(enriched.map((s: any) => s.id));
            clusterSellers = (data || [])
              .filter((s: any) => !foundIds.has(s.id))
              .map(enrichSeller);
          }
        }
      }
    }

    // ── Feature 2: Watchlist (zero-match tracking) ───────────────────────────
    if (!found) {
      // Upsert into watchlist via RPC
      await supabase.rpc('upsert_watchlist', {
        p_value: cleanValue,
        p_type:  type,
      });

      // Check if now flagged
      const { data: wl } = await supabase
        .from('search_watchlist')
        .select('search_count, is_flagged, flag_reason')
        .eq('searched_value', cleanValue)
        .eq('search_type', type)
        .maybeSingle();

      if (wl?.is_flagged) {
        watchlistEntry = {
          search_count: wl.search_count,
          flag_reason:  wl.flag_reason,
          warning:      `⚠️ Unrated — High Search Activity. This identifier has been searched ${wl.search_count} times recently with no database match. It may be linked to an active scam advertisement.`,
        };
      }
    }

    // Log search history
    await supabase.from('searches').insert({
      user_id:        userId || null,
      searched_value: cleanValue,
      search_type:    type,
      result_found:   found,
      ip_address:     ipAddress || null,
      seller_id:      found ? (enriched[0] as any).id : null,
    });

    return {
      found,
      sellers:        enriched,
      cluster_sellers: clusterSellers,   // Feature 1: linked identifiers
      watchlist:      watchlistEntry,    // Feature 2: zero-match warning
      query:          cleanValue,
      type,
    };
  },

  async getTrendingSearches(limit = 10) {
    const { data } = await supabase.rpc('trending_searches', { limit_count: limit });
    return data || [];
  },

  /**
   * Link two or more sellers under the same scammer cluster.
   * Called by admin when a report links multiple identifiers.
   */
  async linkSellerCluster(sellerIds: string[], label?: string) {
    // Create or reuse cluster
    const { data: cluster } = await supabase
      .from('scammer_clusters')
      .insert({ label: label || 'Linked Identifiers' })
      .select('id')
      .single();

    if (!cluster) throw createError('Failed to create cluster', 500);

    // Assign all sellers to this cluster
    await supabase
      .from('sellers')
      .update({ cluster_id: cluster.id })
      .in('id', sellerIds);

    // Sync cluster_id to Elasticsearch for each seller
    for (const sellerId of sellerIds) {
      const { sellerIndexer } = await import('./indexer');
      await sellerIndexer.updateSeller(sellerId, { cluster_id: cluster.id } as any);
    }

    return { cluster_id: cluster.id, linked: sellerIds.length };
  },
};

// ── Elasticsearch query builder ──────────────────────────────────────────────
async function searchWithElasticsearch(
  value: string,
  type: SearchType
): Promise<Record<string, unknown>[]> {
  let esQuery: Record<string, unknown>;

  switch (type) {
    case 'phone':
      esQuery = {
        bool: {
          should: [
            { term:   { phone_number: value } },
            { prefix: { phone_number: value } },
          ],
          minimum_should_match: 1,
        },
      };
      break;

    case 'till_number':
      esQuery = { term: { till_number: value } };
      break;

    case 'paybill':
      esQuery = { term: { paybill_number: value } };
      break;

    case 'business_name':
      esQuery = {
        bool: {
          should: [
            { match: { business_name: { query: value, fuzziness: 'AUTO', boost: 2 } } },
            { match_phrase_prefix: { business_name: { query: value } } },
          ],
          minimum_should_match: 1,
        },
      };
      break;

    case 'tiktok':
      // Feature 3: Fuzzy matching — catches @se11er vs @seller, letter swaps, etc.
      esQuery = {
        bool: {
          should: [
            // Exact keyword match (highest priority)
            { term:  { 'tiktok_handle.keyword': value } },
            // Full-text fuzzy match (catches typo variants)
            { match: { tiktok_handle: { query: value, fuzziness: 'AUTO', boost: 3 } } },
            // Wildcard for partial handles (e.g. searching "seller" matches "@seller_ke")
            { wildcard: { 'tiktok_handle.keyword': { value: `*${value}*`, case_insensitive: true } } },
          ],
          minimum_should_match: 1,
        },
      };
      break;

    case 'social_media':
      // Feature 3: Fuzzy matching for social handles
      esQuery = {
        bool: {
          should: [
            { term:    { 'social_media_handle.keyword': value } },
            { match:   { social_media_handle: { query: value, fuzziness: 'AUTO', boost: 3 } } },
            { wildcard: { 'social_media_handle.keyword': { value: `*${value}*`, case_insensitive: true } } },
          ],
          minimum_should_match: 1,
        },
      };
      break;

    case 'website':
      esQuery = {
        wildcard: { website_url: { value: `*${value}*` } },
      };
      break;

    default:
      throw createError('Invalid search type', 400);
  }

  const response = await esClient.search({
    index: ES_INDEX,
    body: {
      query: esQuery,
      size:  20,
      sort:  [
        { trust_score: { order: 'asc' } }, // highest risk (lowest score) first
        '_score',
      ],
    },
  });

  return response.hits.hits.map((hit: any) => ({
    ...hit._source,
    _score:       hit._score,
    _fuzzy_match: hit._score && hit._score < 1.5, // flag low-confidence fuzzy results
  }));
}

// ── Supabase fallback ────────────────────────────────────────────────────────
async function searchWithSupabase(
  value: string,
  type: SearchType
): Promise<Record<string, unknown>[]> {
  const fieldMap: Record<SearchType, string> = {
    phone:         'phone_number',
    till_number:   'till_number',
    paybill:       'paybill_number',
    business_name: 'business_name',
    tiktok:        'tiktok_handle',
    social_media:  'social_media_handle',
    website:       'website_url',
  };
  const field = fieldMap[type];

  let q = supabase
    .from('sellers')
    .select('*')
    .order('trust_score', { ascending: true })
    .limit(20);

  if (type === 'till_number' || type === 'paybill') {
    q = q.eq(field, value);
  } else {
    q = q.ilike(field, `%${value}%`);
  }

  const { data } = await q;
  return data || [];
}

function enrichSeller(s: Record<string, unknown>) {
  const score = s.trust_score as number;
  let label = 'UNKNOWN';
  if      (score >= 86) label = 'TRUSTED';
  else if (score >= 61) label = 'GOOD';
  else if (score >= 31) label = 'CAUTION';
  else                  label = 'HIGH RISK';
  return { ...s, trust_label: label };
}
