/**
 * Chart data fetchers — all direct Supabase queries, no APIs.
 */
import { supabase } from './supabase';

/** Daily search volume for the last 14 days */
export async function getDailySearches() {
  const { data } = await supabase
    .from('searches')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString());

  if (!data) return [];

  // Group by day
  const map: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    map[key] = 0;
  }
  for (const row of data) {
    const key = new Date(row.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

/** Daily report submissions for the last 14 days, split by status */
export async function getDailyReports() {
  const { data } = await supabase
    .from('reports')
    .select('created_at, status')
    .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString());

  if (!data) return [];

  const map: Record<string, { date: string; pending: number; approved: number; rejected: number }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    map[key] = { date: key, pending: 0, approved: 0, rejected: 0 };
  }
  for (const row of data) {
    const key = new Date(row.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    if (key in map) {
      const s = row.status as 'pending' | 'approved' | 'rejected';
      if (s in map[key]) map[key][s]++;
    }
  }
  return Object.values(map);
}

/** Trust score distribution across all sellers */
export async function getTrustDistribution() {
  const { data } = await supabase.from('sellers').select('trust_score');
  if (!data) return [];

  const buckets = [
    { label: 'HIGH RISK (0–30)',  min: 0,  max: 30,  count: 0, fill: '#ef4444' },
    { label: 'CAUTION (31–60)',   min: 31, max: 60,  count: 0, fill: '#f59e0b' },
    { label: 'GOOD (61–85)',      min: 61, max: 85,  count: 0, fill: '#3b82f6' },
    { label: 'TRUSTED (86–100)', min: 86, max: 100, count: 0, fill: '#10b981' },
  ];
  for (const { trust_score } of data) {
    const b = buckets.find(b => trust_score >= b.min && trust_score <= b.max);
    if (b) b.count++;
  }
  return buckets.filter(b => b.count > 0);
}

/** Report category breakdown */
export async function getReportCategories() {
  const { data } = await supabase
    .from('reports')
    .select('category')
    .eq('status', 'approved');

  if (!data) return [];

  const map: Record<string, number> = {};
  for (const { category } of data) {
    map[category] = (map[category] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value);
}

/** Top 10 most-reported sellers */
export async function getTopReportedSellers() {
  const { data } = await supabase
    .from('sellers')
    .select('business_name, phone_number, total_reports, trust_score')
    .order('total_reports', { ascending: false })
    .limit(10);

  return (data || []).map(s => ({
    name:    s.business_name || s.phone_number || 'Unknown',
    reports: s.total_reports,
    score:   s.trust_score,
  }));
}
