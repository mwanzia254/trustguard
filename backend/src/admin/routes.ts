import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { supabase } from '../database/supabase';
import { createError } from '../middleware/errorHandler';
import { sellersService } from '../sellers/service';
import { fcmService } from '../notifications/fcm';
import { searchService } from '../search/service';
import { AuthRequest } from '../middleware/auth';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

// ── Dashboard stats ──────────────────────────────────────────────────────────
adminRouter.get('/dashboard', async (_req: any, res: any, next: any) => {
  try {
    const [
      { count: totalSearches },
      { count: highRisk },
      { count: pendingReports },
      { count: bannedUsers },
      { count: activeScams },
      { count: watchlistFlags },
    ] = await Promise.all([
      supabase.from('searches').select('*', { count: 'exact', head: true }),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'high_risk'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
      supabase.from('sellers').select('*', { count: 'exact', head: true }).in('status', ['high_risk', 'caution']),
      supabase.from('search_watchlist').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
    ]);

    res.json({
      success: true,
      data: {
        total_searches:    totalSearches  ?? 0,
        high_risk_sellers: highRisk       ?? 0,
        pending_reports:   pendingReports ?? 0,
        banned_users:      bannedUsers    ?? 0,
        active_scams:      activeScams    ?? 0,
        watchlist_flags:   watchlistFlags ?? 0,   // NEW: zero-match flagged terms
      },
    });
  } catch (err) { next(err); }
});

// ── List reports ─────────────────────────────────────────────────────────────
adminRouter.get('/reports', async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status || 'pending';
    const page   = parseInt(req.query.page) || 1;
    const limit  = 20;
    const from   = (page - 1) * limit;

    const { data, error } = await supabase
      .from('reports')
      .select(`
        id, category, description, status, amount_lost, ai_risk_score,
        ai_pattern, ai_severity, reporter_weight, created_at,
        profiles(name),
        sellers(business_name, phone_number, trust_score)
      `)
      .eq('status', status)
      .order('ai_risk_score', { ascending: false, nullsFirst: false })
      .range(from, from + limit - 1);

    if (error) return next(createError('Failed to fetch reports', 500));
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

// ── Approve / reject report ──────────────────────────────────────────────────
adminRouter.patch('/reports/:id', async (req: AuthRequest, res: any, next: any) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return next(createError('Action must be approve or reject', 400));
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { data: report, error } = await supabase
      .from('reports')
      .update({
        status:      newStatus,
        reviewed_by: req.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('seller_id, user_id')
      .single();

    if (error || !report) return next(createError('Report not found', 404));

    await sellersService.recalculateTrustScore(report.seller_id);

    // Notify reporter via FCM
    if (report.user_id) {
      await fcmService.notifyReportStatus(
        report.user_id,
        newStatus as 'approved' | 'rejected',
        req.params.id
      );
    }

    // Warn recent searchers if approved
    if (action === 'approve') {
      await fcmService.notifyRecentSearchers(report.seller_id, 1);
    }

    res.json({ success: true, message: `Report ${newStatus}` });
  } catch (err) { next(err); }
});

// ── List users ───────────────────────────────────────────────────────────────
adminRouter.get('/users', async (req: any, res: any, next: any) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = 20;
    const from  = (page - 1) * limit;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, role, is_verified, is_banned, reputation_score, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return next(createError('Failed to fetch users', 500));
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

// ── Ban / unban user ─────────────────────────────────────────────────────────
adminRouter.patch('/users/:id/ban', async (req: any, res: any, next: any) => {
  try {
    const { ban } = req.body;
    await supabase.from('profiles').update({ is_banned: !!ban }).eq('id', req.params.id);
    res.json({ success: true, message: ban ? 'User banned' : 'User unbanned' });
  } catch (err) { next(err); }
});

// ── Block seller ─────────────────────────────────────────────────────────────
adminRouter.patch('/sellers/:id/block', async (req: any, res: any, next: any) => {
  try {
    await supabase.from('sellers').update({ status: 'blocked', trust_score: 0 }).eq('id', req.params.id);
    res.json({ success: true, message: 'Seller blocked' });
  } catch (err) { next(err); }
});

// ── Promote to contributor ───────────────────────────────────────────────────
adminRouter.patch('/users/:id/promote', async (req: any, res: any, next: any) => {
  try {
    await supabase.from('profiles').update({ role: 'contributor' }).eq('id', req.params.id).eq('role', 'user');
    res.json({ success: true, message: 'User promoted to contributor' });
  } catch (err) { next(err); }
});

// ── Scammer Graph: Link sellers into a cluster ───────────────────────────────
adminRouter.post('/sellers/cluster', async (req: any, res: any, next: any) => {
  try {
    const { seller_ids, label } = req.body;
    if (!Array.isArray(seller_ids) || seller_ids.length < 2) {
      return next(createError('Provide at least 2 seller IDs to link', 400));
    }
    const result = await searchService.linkSellerCluster(seller_ids, label);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── Watchlist: Get flagged zero-match searches ───────────────────────────────
adminRouter.get('/watchlist', async (req: any, res: any, next: any) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = 20;
    const from  = (page - 1) * limit;

    const { data, error } = await supabase
      .from('search_watchlist')
      .select('*')
      .eq('is_flagged', true)
      .order('search_count', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return next(createError('Failed to fetch watchlist', 500));
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});
