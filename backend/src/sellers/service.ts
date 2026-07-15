import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { sellerIndexer } from '../search/indexer';

// ── User reporting power weights by role ────────────────────────────────────
// Verified contributors and users with clean approval history carry more weight.
// This prevents competitors from "review bombing" a seller.
const ROLE_WEIGHT: Record<string, number> = {
  admin:       3.0,
  contributor: 2.0,
  user:        1.0,
};

/**
 * Calculate the reporting weight of a user based on their role
 * and their ratio of admin-approved reports (credibility score).
 */
async function getUserReportingWeight(userId: string): Promise<number> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const roleWeight = ROLE_WEIGHT[profile?.role ?? 'user'] ?? 1.0;

  // Credibility: how many of this user's past reports were approved vs total
  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: approvedReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved');

  const total    = totalReports ?? 0;
  const approved = approvedReports ?? 0;

  // New users (< 3 reports) get neutral weight; established users earn credibility
  if (total < 3) return roleWeight;

  const approvalRatio = approved / total; // 0.0 – 1.0
  // Scale: bad actor (0% approval) → 0.3x weight, perfect record → 1.5x boost
  const credibility = 0.3 + approvalRatio * 1.2;

  return roleWeight * credibility;
}

/**
 * Time-decay function for a report.
 * Recent reports have full weight; reports from a year ago have ~10% weight.
 * Uses exponential decay: weight = e^(-λ * days)  where λ controls decay rate.
 */
function timeDecayWeight(reportDate: string): number {
  const ageMs   = Date.now() - new Date(reportDate).getTime();
  const ageDays = ageMs / 86400000;
  const LAMBDA  = 0.005; // half-life ≈ 139 days; year-old report ≈ 16% weight
  return Math.exp(-LAMBDA * ageDays);
}

export const sellersService = {
  async getById(id: string) {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !seller) throw createError('Seller not found', 404);

    const { count: approvedReports } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', id)
      .eq('status', 'approved');

    const { data: categories } = await supabase
      .from('reports')
      .select('category')
      .eq('seller_id', id)
      .eq('status', 'approved');

    const { data: reviewStats } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', id);

    const avgRating = reviewStats && reviewStats.length > 0
      ? reviewStats.reduce((s, r) => s + r.rating, 0) / reviewStats.length
      : null;

    const uniqueCategories = [...new Set((categories || []).map((c: any) => c.category))];

    return enrichSeller({
      ...seller,
      approved_reports:    approvedReports ?? 0,
      total_reviews:       reviewStats?.length ?? 0,
      avg_rating:          avgRating,
      complaint_categories: uniqueCategories,
    });
  },

  async getAll(page = 1, limit = 20, status?: string) {
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    let q = supabase
      .from('sellers')
      .select(
        'id,business_name,phone_number,till_number,paybill_number,trust_score,status,total_reports,is_verified,created_at',
        { count: 'exact' }
      )
      .order('trust_score', { ascending: true })
      .range(from, to);

    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) throw createError('Failed to fetch sellers', 500);

    return {
      sellers:    data || [],
      total:      count ?? 0,
      page,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  },

  async getRecentReports(sellerId: string, limit = 5) {
    const { data } = await supabase
      .from('reports')
      .select('id,category,description,amount_lost,currency,created_at,profiles(name)')
      .eq('seller_id', sellerId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map((r: any) => ({
      ...r,
      reporter_name: r.profiles?.name,
    }));
  },

  /**
   * Recalculate trust score using:
   * 1. Weighted reports   — each report's penalty scaled by reporter credibility
   * 2. Time-decay         — old reports penalise less than recent ones
   * 3. Review ratings     — positive ratings raise the score
   * 4. Verification bonus
   * 5. Account age bonus
   */
  async recalculateTrustScore(sellerId: string) {
    const { data: seller } = await supabase
      .from('sellers')
      .select('is_verified, created_at')
      .eq('id', sellerId)
      .single();

    if (!seller) return;

    // Fetch all approved reports with reporter info + timestamp
    const { data: reports } = await supabase
      .from('reports')
      .select('id, user_id, created_at')
      .eq('seller_id', sellerId)
      .eq('status', 'approved');

    // ── 1. Weighted + time-decayed report penalty ───────────────────────────
    let weightedReportPenalty = 0;

    for (const report of reports || []) {
      const userWeight   = await getUserReportingWeight(report.user_id);
      const decayFactor  = timeDecayWeight(report.created_at);
      // Base penalty per report is 4 points, scaled by weight and decay
      weightedReportPenalty += 4 * userWeight * decayFactor;
    }

    const nApproved = reports?.length ?? 0;

    // ── 2. Review ratings ───────────────────────────────────────────────────
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('seller_id', sellerId);

    const totalReviews = reviews?.length ?? 0;
    const avgRating    = totalReviews > 0
      ? reviews!.reduce((s: number, r: any) => s + r.rating, 0) / totalReviews
      : 3;

    // ── 3. Account age bonus (capped at 10 points) ──────────────────────────
    const ageDays  = Math.floor((Date.now() - new Date(seller.created_at).getTime()) / 86400000);
    const ageBonus = Math.min(ageDays / 30, 10);

    // ── Final score ─────────────────────────────────────────────────────────
    let score = 100;
    score -= weightedReportPenalty;
    score += (avgRating - 3) * 5 * totalReviews;
    score += seller.is_verified ? 10 : 0;
    score += ageBonus;
    score  = Math.max(0, Math.min(100, Math.round(score)));

    let status = 'unknown';
    if      (score >= 86) status = 'trusted';
    else if (score >= 61) status = 'good';
    else if (score >= 31) status = 'caution';
    else                  status = 'high_risk';

    await supabase
      .from('sellers')
      .update({
        trust_score:   score,
        status,
        total_reports: nApproved,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', sellerId);

    // Sync to Elasticsearch
    await sellerIndexer.updateSeller(sellerId, { trust_score: score, status });

    return { trust_score: score, status };
  },
};

function enrichSeller(seller: Record<string, unknown>) {
  const score = seller.trust_score as number;
  let label = 'UNKNOWN';
  let color = 'gray';
  if      (score >= 86) { label = 'TRUSTED';   color = 'green';  }
  else if (score >= 61) { label = 'GOOD';       color = 'blue';   }
  else if (score >= 31) { label = 'CAUTION';    color = 'yellow'; }
  else                  { label = 'HIGH RISK';  color = 'red';    }
  return { ...seller, trust_label: label, trust_color: color };
}
