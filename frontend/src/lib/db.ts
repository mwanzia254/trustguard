/**
 * ScamChek Data Layer — all queries go directly to Supabase.
 * No Express backend. No Axios. No external APIs.
 */
import { supabase } from './supabase';
import { getTrustLabel } from './aiEngine';

// ── Trust score helpers ──────────────────────────────────────────────────────
function enrichSeller(s: any) {
  return { ...s, trust_label: getTrustLabel(s.trust_score ?? 100) };
}

// ── SEARCH ───────────────────────────────────────────────────────────────────
export type SearchType =
  | 'phone' | 'till_number' | 'paybill' | 'business_name'
  | 'tiktok' | 'social_media' | 'website';

const FIELD_MAP: Record<SearchType, string> = {
  phone:         'phone_number',
  till_number:   'till_number',
  paybill:       'paybill_number',
  business_name: 'business_name',
  tiktok:        'tiktok_handle',
  social_media:  'social_media_handle',
  website:       'website_url',
};

export async function searchSellers(value: string, type: SearchType, userId?: string) {
  const clean = value.trim().toLowerCase().replace(/^@/, '');
  const field = FIELD_MAP[type];

  // ── Primary search: exact / ilike ────────────────────────────────────────
  let q = supabase.from('sellers').select('*').order('trust_score', { ascending: true }).limit(20);

  if (type === 'till_number' || type === 'paybill') {
    q = q.eq(field, clean);
  } else {
    q = q.ilike(field, `%${clean}%`);
  }

  const { data: primarySellers } = await q;
  let sellers = primarySellers || [];

  // ── Fuzzy pass: for text-based identifiers only ───────────────────────────
  // Fetch a broader candidate pool and rank by Levenshtein similarity.
  // This catches scammers who swap letters: @se11er vs @seller, @tru5tguard etc.
  let fuzzyMatches: any[] = [];

  if (['tiktok', 'social_media', 'business_name'].includes(type)) {
    const { fuzzyRankSellers } = await import('./aiEngine');

    // Pull up to 200 candidates that share at least the first character
    const firstChar = clean[0] || '';
    const { data: candidates } = await supabase
      .from('sellers')
      .select('*')
      .ilike(field, `${firstChar}%`)
      .limit(200);

    if (candidates && candidates.length > 0) {
      const ranked = fuzzyRankSellers(clean, candidates, field);

      // Exclude sellers already in primary results
      const primaryIds = new Set(sellers.map((s: any) => s.id));
      fuzzyMatches = ranked
        .filter(s => !primaryIds.has(s.id))
        .slice(0, 5); // max 5 fuzzy suggestions
    }
  }

  const found = sellers.length > 0 || fuzzyMatches.length > 0;
  const enriched = sellers.map(enrichSeller);

  // Fetch approved report categories for each seller
  for (const s of enriched) {
    const { data: cats } = await supabase
      .from('reports')
      .select('category')
      .eq('seller_id', s.id)
      .eq('status', 'approved');
    s.categories = [...new Set((cats || []).map((c: any) => c.category))];
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', s.id)
      .eq('status', 'approved');
    s.approved_reports = count ?? 0;
  }

  // Log search
  await supabase.from('searches').insert({
    user_id:        userId || null,
    searched_value: clean,
    search_type:    type,
    result_found:   found,
    seller_id:      found ? enriched[0].id : null,
  }).maybeSingle();

  // Zero-match watchlist
  let watchlist = null;
  if (!found) {
    await supabase.rpc('upsert_watchlist', { p_value: clean, p_type: type });
    const { data: wl } = await supabase
      .from('search_watchlist')
      .select('search_count, is_flagged')
      .eq('searched_value', clean)
      .eq('search_type', type)
      .maybeSingle();
    if (wl?.is_flagged) {
      watchlist = {
        search_count: wl.search_count,
        warning: `⚠️ Unrated — High Search Activity. This identifier has been searched ${wl.search_count} times recently with no database match. May be linked to an active scam.`,
      };
    }
  }

  // Scammer graph — find linked sellers in same cluster
  let clusterSellers: any[] = [];
  if (found) {
    const clusterIds = [...new Set(enriched.map((s: any) => s.cluster_id).filter(Boolean))];
    if (clusterIds.length > 0) {
      const foundIds = new Set(enriched.map((s: any) => s.id));
      const { data: linked } = await supabase
        .from('sellers').select('*').in('cluster_id', clusterIds).limit(10);
      clusterSellers = (linked || []).filter((s: any) => !foundIds.has(s.id)).map(enrichSeller);
    }
  }

  return { found, sellers: enriched, fuzzy_sellers: fuzzyMatches.map(enrichSeller), cluster_sellers: clusterSellers, watchlist };
}

export async function getTrendingSearches(limit = 10) {
  const { data } = await supabase.rpc('trending_searches', { limit_count: limit });
  return data || [];
}

// ── SELLERS ──────────────────────────────────────────────────────────────────
export async function getSellerById(id: string) {
  const { data: seller } = await supabase.from('sellers').select('*').eq('id', id).single();
  if (!seller) return null;

  const { count: approvedReports } = await supabase
    .from('reports').select('*', { count: 'exact', head: true })
    .eq('seller_id', id).eq('status', 'approved');

  const { data: cats } = await supabase
    .from('reports').select('category').eq('seller_id', id).eq('status', 'approved');

  const { data: recentReports } = await supabase
    .from('reports')
    .select('id, category, description, amount_lost, currency, created_at, profiles(name)')
    .eq('seller_id', id).eq('status', 'approved')
    .order('created_at', { ascending: false }).limit(10); // more for AI analysis

  // Reviews for AI analysis
  const { data: reviewRows } = await supabase
    .from('reviews').select('rating').eq('seller_id', id);
  const totalReviews = reviewRows?.length ?? 0;
  const avgRating = totalReviews > 0
    ? reviewRows!.reduce((s, r) => s + r.rating, 0) / totalReviews
    : null;

  return enrichSeller({
    ...seller,
    approved_reports:     approvedReports ?? 0,
    complaint_categories: [...new Set((cats || []).map((c: any) => c.category))],
    recent_reports:       (recentReports || []).map((r: any) => ({ ...r, reporter_name: r.profiles?.name })),
    total_reviews:        totalReviews,
    avg_rating:           avgRating,
  });
}

export async function getAllSellers(page = 1, limit = 20, status?: string) {
  const from = (page - 1) * limit;
  let q = supabase.from('sellers')
    .select('id,business_name,phone_number,till_number,paybill_number,trust_score,status,total_reports,is_verified,created_at', { count: 'exact' })
    .order('trust_score', { ascending: true }).range(from, from + limit - 1);
  if (status) q = q.eq('status', status);
  const { data, count } = await q;
  return { sellers: (data || []).map(enrichSeller), total: count ?? 0, page };
}

// ── REVIEWS ──────────────────────────────────────────────────────────────────
export async function getReviewsBySeller(sellerId: string, page = 1) {
  const from = (page - 1) * 10;
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, profiles(name)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(from, from + 9);

  const { data: stats } = await supabase.from('reviews').select('rating').eq('seller_id', sellerId);
  const count = stats?.length ?? 0;
  const avg   = count > 0 ? stats!.reduce((s, r) => s + r.rating, 0) / count : null;

  return {
    reviews: (reviews || []).map((r: any) => ({ ...r, reviewer_name: r.profiles?.name })),
    stats:   { count, avg_rating: avg },
  };
}

export async function createReview(sellerId: string, userId: string, rating: number, comment: string) {
  // Check duplicate
  const { data: ex } = await supabase.from('reviews').select('id')
    .eq('seller_id', sellerId).eq('user_id', userId).maybeSingle();
  if (ex) throw new Error('You have already reviewed this seller');

  const { data, error } = await supabase.from('reviews')
    .insert({ seller_id: sellerId, user_id: userId, rating, comment }).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
export async function getMyReports(userId: string, page = 1) {
  const from = (page - 1) * 10;
  const { data } = await supabase
    .from('reports')
    .select('id, category, description, status, amount_lost, currency, ai_risk_score, ai_pattern, created_at, sellers(business_name, phone_number)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, from + 9);
  return (data || []).map((r: any) => ({
    ...r, business_name: r.sellers?.business_name, phone_number: r.sellers?.phone_number,
  }));
}

export async function submitReport(input: {
  seller_id?: string;
  searched_value?: string;
  search_type?: string;
  user_id: string;
  category: string;
  description: string;
  amount_lost?: number;
  currency?: string;
  ai_risk_score?: number;
  ai_pattern?: string;
  ai_severity?: string;
  files?: File[];
}) {
  let sellerId = input.seller_id;

  // Auto-create seller if needed
  if (!sellerId && input.searched_value) {
    const colMap: Record<string, string> = {
      phone: 'phone_number', till_number: 'till_number', paybill: 'paybill_number',
      business_name: 'business_name', tiktok: 'tiktok_handle',
      social_media: 'social_media_handle', website: 'website_url',
    };
    const col = colMap[input.search_type || 'phone'] || 'phone_number';
    const { data: ex } = await supabase.from('sellers').select('id').eq(col, input.searched_value).maybeSingle();
    if (ex) {
      sellerId = ex.id;
    } else {
      const { data: ns } = await supabase.from('sellers').insert({ [col]: input.searched_value } as any).select('id').single();
      sellerId = ns!.id;
    }
  }

  if (!sellerId) throw new Error('Seller identification required');

  const { data: report, error } = await supabase.from('reports').insert({
    seller_id:     sellerId,
    user_id:       input.user_id,
    category:      input.category,
    description:   input.description,
    amount_lost:   input.amount_lost || null,
    currency:      input.currency || 'KES',
    ai_risk_score: input.ai_risk_score,
    ai_pattern:    input.ai_pattern,
    ai_severity:   input.ai_severity,
  }).select('*').single();

  if (error) throw new Error(error.message);

  // Auto-cluster: detect other identifiers in description and link them
  // This runs in background — non-fatal if it fails
  autoClusterFromReport(sellerId, input.description).catch(() => {});

  // Upload evidence files directly to Supabase Storage
  if (input.files && input.files.length > 0) {
    for (const file of input.files) {
      const path = `reports/${report.id}/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('evidence').upload(path, file, { contentType: file.type });
      if (!upErr) {
        const { data: url } = supabase.storage.from('evidence').getPublicUrl(path);
        await supabase.from('evidence').insert({
          report_id: report.id, storage_path: path,
          public_url: url.publicUrl, file_type: file.type,
          original_name: file.name, file_size: file.size,
        });
      }
    }
  }

  return report;
}

// ── SCAMMER GRAPH ────────────────────────────────────────────────────────────

/**
 * Link multiple sellers under one cluster ID.
 * If any seller already has a cluster, all others join it.
 * If none have a cluster, a new one is created.
 * All Supabase — no API.
 */
export async function linkSellersIntoCluster(sellerIds: string[], label?: string): Promise<string> {
  // Check if any seller already belongs to a cluster
  const { data: existing } = await supabase
    .from('sellers')
    .select('cluster_id')
    .in('id', sellerIds)
    .not('cluster_id', 'is', null);

  let clusterId: string;

  if (existing && existing.length > 0) {
    // Reuse the first existing cluster
    clusterId = existing[0].cluster_id;
  } else {
    // Create a new cluster
    const { data: cluster, error } = await supabase
      .from('scammer_clusters')
      .insert({ label: label || 'Linked Scammer Network' })
      .select('id')
      .single();
    if (error || !cluster) throw new Error('Failed to create cluster');
    clusterId = cluster.id;
  }

  // Assign all sellers to this cluster
  await supabase
    .from('sellers')
    .update({ cluster_id: clusterId })
    .in('id', sellerIds);

  return clusterId;
}

/**
 * Auto-cluster: extract all identifiers from a report description + form fields,
 * find/create seller records for each, then link them.
 * Called automatically when a report is submitted with multiple identifiers.
 */
export async function autoClusterFromReport(
  primarySellerId: string,
  description: string
): Promise<void> {
  const { extractIdentifiers } = await import('./aiEngine');
  const ids = extractIdentifiers(description);

  const sellerIds: string[] = [primarySellerId];

  // For each detected identifier, find or create a seller record
  const checks: Array<{ value: string; col: string }> = [
    ...ids.phones.map(v   => ({ value: v, col: 'phone_number' })),
    ...ids.tills.map(v    => ({ value: v, col: 'till_number' })),
    ...ids.paybills.map(v => ({ value: v, col: 'paybill_number' })),
    ...ids.tiktoks.map(v  => ({ value: v, col: 'tiktok_handle' })),
  ];

  for (const { value, col } of checks) {
    if (!value) continue;
    const { data: found } = await supabase
      .from('sellers').select('id').eq(col, value).maybeSingle();

    if (found && found.id !== primarySellerId) {
      sellerIds.push(found.id);
    }
    // Don't auto-create sellers just from description text —
    // only link existing ones to avoid false positives
  }

  // Only cluster if we found 2+ linked sellers
  if (sellerIds.length >= 2) {
    await linkSellersIntoCluster(sellerIds);
  }
}

/**
 * Get all clusters with their member sellers.
 * Used in the admin panel to view and manage the scammer graph.
 */
export async function getAllClusters() {
  const { data: clusters } = await supabase
    .from('scammer_clusters')
    .select('id, label, risk_score, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!clusters || clusters.length === 0) return [];

  // Fetch members for each cluster
  const result = [];
  for (const cluster of clusters) {
    const { data: members } = await supabase
      .from('sellers')
      .select('id, business_name, phone_number, till_number, paybill_number, tiktok_handle, trust_score, status, total_reports')
      .eq('cluster_id', cluster.id);

    result.push({
      ...cluster,
      members: (members || []).map(enrichSeller),
      member_count: members?.length ?? 0,
    });
  }

  return result;
}

/**
 * Remove a seller from its cluster.
 */
export async function removeFromCluster(sellerId: string): Promise<void> {
  await supabase
    .from('sellers')
    .update({ cluster_id: null })
    .eq('id', sellerId);
}


export async function getAdminStats() {
  const [s, hr, pr, bu, ac, wf] = await Promise.all([
    supabase.from('searches').select('*', { count: 'exact', head: true }),
    supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'high_risk'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('sellers').select('*', { count: 'exact', head: true }).in('status', ['high_risk', 'caution']),
    supabase.from('search_watchlist').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
  ]);
  return {
    total_searches:    s.count    ?? 0,
    high_risk_sellers: hr.count   ?? 0,
    pending_reports:   pr.count   ?? 0,
    banned_users:      bu.count   ?? 0,
    active_scams:      ac.count   ?? 0,
    watchlist_flags:   wf.count   ?? 0,
  };
}

export async function getAdminReports(status = 'pending', page = 1) {
  const from = (page - 1) * 20;
  const { data } = await supabase.from('reports')
    .select('id, category, description, status, amount_lost, ai_risk_score, ai_pattern, ai_severity, reporter_weight, created_at, profiles(name), sellers(business_name, phone_number, trust_score)')
    .eq('status', status)
    .order('ai_risk_score', { ascending: false, nullsFirst: false })
    .range(from, from + 19);
  return (data || []).map((r: any) => ({
    ...r,
    reporter_name: r.profiles?.name,
    business_name: r.sellers?.business_name,
    phone_number:  r.sellers?.phone_number,
  }));
}

export async function reviewReport(reportId: string, action: 'approve' | 'reject', adminId: string) {
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await supabase.from('reports').update({ status: newStatus, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq('id', reportId);
}

export async function getAdminUsers(page = 1) {
  const from = (page - 1) * 20;
  const { data } = await supabase.from('profiles')
    .select('id, name, phone, role, is_verified, is_banned, reputation_score, created_at')
    .order('created_at', { ascending: false }).range(from, from + 19);
  return data || [];
}

export async function banUser(userId: string, ban: boolean) {
  await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId);
}

export async function promoteUser(userId: string) {
  await supabase.from('profiles').update({ role: 'contributor' }).eq('id', userId).eq('role', 'user');
}

export async function blockSeller(sellerId: string) {
  await supabase.from('sellers').update({ status: 'blocked', trust_score: 0 }).eq('id', sellerId);
}

export async function getWatchlist(page = 1) {
  const from = (page - 1) * 20;
  const { data } = await supabase.from('search_watchlist')
    .select('*').eq('is_flagged', true)
    .order('search_count', { ascending: false }).range(from, from + 19);
  return data || [];
}
