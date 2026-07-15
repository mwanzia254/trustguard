import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminStats, getAdminReports, reviewReport,
  getAdminUsers, banUser, promoteUser, getWatchlist,
  getAllClusters, linkSellersIntoCluster, removeFromCluster,
} from '../lib/db';
import {
  getDailySearches, getDailyReports,
  getTrustDistribution, getReportCategories, getTopReportedSellers,
} from '../lib/chartData';
import { useAuthStore } from '../store/authStore';
import { Shield, AlertTriangle, Users, CheckCircle, XCircle, Loader2, Brain, Eye, Link2, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export const AdminPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab,    setActiveTab]    = useState<'dashboard' | 'reports' | 'users' | 'watchlist' | 'clusters'>('dashboard');
  const [reportStatus, setReportStatus] = useState('pending');
  // Manual cluster linking
  const [clusterIds,   setClusterIds]   = useState('');
  const [clusterLabel, setClusterLabel] = useState('');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });

  // Chart data — only fetched when dashboard tab is active
  const { data: dailySearches = [] } = useQuery({ queryKey: ['chart-searches'],     queryFn: getDailySearches,       enabled: activeTab === 'dashboard' });
  const { data: dailyReports  = [] } = useQuery({ queryKey: ['chart-reports'],      queryFn: getDailyReports,        enabled: activeTab === 'dashboard' });
  const { data: trustDist     = [] } = useQuery({ queryKey: ['chart-trust-dist'],   queryFn: getTrustDistribution,   enabled: activeTab === 'dashboard' });
  const { data: reportCats    = [] } = useQuery({ queryKey: ['chart-report-cats'],  queryFn: getReportCategories,    enabled: activeTab === 'dashboard' });
  const { data: topSellers    = [] } = useQuery({ queryKey: ['chart-top-sellers'],  queryFn: getTopReportedSellers,  enabled: activeTab === 'dashboard' });

  const { data: reports = [], isLoading: rLoading } = useQuery({
    queryKey: ['admin-reports', reportStatus],
    queryFn:  () => getAdminReports(reportStatus),
    enabled:  activeTab === 'reports',
  });

  const { data: users = [], isLoading: uLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => getAdminUsers(),
    enabled:  activeTab === 'users',
  });

  const { data: watchlistRaw } = useQuery({
    queryKey: ['watchlist'],
    queryFn:  () => getWatchlist(),
    enabled:  activeTab === 'watchlist',
  });
  const watchlist = (watchlistRaw ?? []) as any[];

  const { data: clustersRaw, isLoading: cLoading } = useQuery({
    queryKey: ['admin-clusters'],
    queryFn:  () => getAllClusters(),
    enabled:  activeTab === 'clusters',
  });
  const clusters = (clustersRaw ?? []) as any[];

  const reviewMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      reviewReport(id, action, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Report updated');
    },
    onError: () => toast.error('Action failed'),
  });

  const banMut = useMutation({
    mutationFn: ({ id, ban }: { id: string; ban: boolean }) => banUser(id, ban),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
  });

  const handleLinkCluster = async () => {
    const ids = clusterIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length < 2) { toast.error('Enter at least 2 seller IDs separated by commas'); return; }
    try {
      await linkSellersIntoCluster(ids, clusterLabel || undefined);
      toast.success(`Linked ${ids.length} sellers into a cluster`);
      setClusterIds('');
      setClusterLabel('');
      queryClient.invalidateQueries({ queryKey: ['admin-clusters'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to link cluster');
    }
  };

  const handleRemoveFromCluster = async (sellerId: string) => {
    await removeFromCluster(sellerId);
    queryClient.invalidateQueries({ queryKey: ['admin-clusters'] });
    toast.success('Seller removed from cluster');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield        },
    { id: 'reports',   label: 'Reports',   icon: AlertTriangle },
    { id: 'users',     label: 'Users',     icon: Users         },
    { id: 'clusters',  label: 'Clusters',  icon: Link2         },
    { id: 'watchlist', label: 'Watchlist', icon: Eye           },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary-600 text-white p-2 rounded-xl"><Shield size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm">ScamChek Management Dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Dashboard ── */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Searches',    value: (stats.total_searches as number)?.toLocaleString(), color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { label: 'High Risk Sellers', value: stats.high_risk_sellers,                            color: 'text-red-600',    bg: 'bg-red-50'    },
              { label: 'Pending Reports',   value: stats.pending_reports,                              color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Active Scams',      value: stats.active_scams,                                 color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Banned Users',      value: stats.banned_users,                                 color: 'text-gray-600',   bg: 'bg-gray-50'   },
              { label: 'Watchlist Flags',   value: stats.watchlist_flags,                              color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-5 text-center border border-gray-100`}>
                <p className={`text-3xl font-extrabold ${color}`}>{value ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Row 1: Search volume + Report activity */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">📈 Daily Search Volume (14 days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailySearches as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Searches" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">📋 Daily Reports (14 days)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyReports as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pending"  name="Pending"  fill="#f59e0b" stackId="a" />
                  <Bar dataKey="approved" name="Approved" fill="#10b981" stackId="a" />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Trust distribution + Report categories */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">🎯 Seller Trust Distribution</h3>
              {(trustDist as any[]).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No seller data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={trustDist as any[]} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                      {(trustDist as any[]).map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-4 text-sm">🚨 Report Categories (Approved)</h3>
              {(reportCats as any[]).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No approved reports yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={reportCats as any[]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                      {(reportCats as any[]).map((_: any, i: number) => (
                        <Cell key={i} fill={['#ef4444','#f59e0b','#3b82f6','#10b981','#8b5cf6','#ec4899'][i % 6]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Row 3: Top reported sellers */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4 text-sm">🏴‍☠️ Top 10 Most Reported Sellers</h3>
            {(topSellers as any[]).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSellers as any[]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="reports" name="Reports" radius={[0, 4, 4, 0]}>
                    {(topSellers as any[]).map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.score < 31 ? '#ef4444' : entry.score < 61 ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <Brain size={16} /> AI Monitoring Active (Browser-based)
            </h3>
            <p className="text-sm text-blue-700">
              AI runs entirely in the browser — no external APIs. Reports are scored for scam patterns, spam detection,
              and risk prediction. Trust scores update in real time via Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {activeTab === 'reports' && (
        <div>
          <div className="flex gap-2 mb-5 flex-wrap">
            {['pending', 'approved', 'rejected', 'investigating'].map(s => (
              <button key={s} onClick={() => setReportStatus(s)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${reportStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
          {rLoading ? (
            <div className="text-center py-16"><Loader2 size={32} className="animate-spin text-primary-500 mx-auto" /></div>
          ) : (reports as any[]).length === 0 ? (
            <div className="text-center py-16 text-gray-400">No {reportStatus} reports.</div>
          ) : (
            <div className="space-y-4">
              {(reports as any[]).map((report: any) => (
                <div key={report.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-gray-900">{report.business_name || report.phone_number || 'Unknown'}</span>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize">{report.category?.replace(/_/g, ' ')}</span>
                        {report.ai_risk_score && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI Risk: {Math.round(report.ai_risk_score)}%</span>}
                        {report.reporter_weight && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Weight: {report.reporter_weight}x</span>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{report.description}</p>
                      <div className="text-xs text-gray-400 flex gap-4 flex-wrap">
                        <span>By: {report.reporter_name || 'Anonymous'}</span>
                        {report.amount_lost && <span className="text-red-500">Lost: KES {Number(report.amount_lost).toLocaleString()}</span>}
                        <span>{formatDate(report.created_at)}</span>
                        {report.ai_pattern && <span className="text-purple-500">Pattern: {report.ai_pattern}</span>}
                      </div>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => reviewMut.mutate({ id: report.id, action: 'approve' })} disabled={reviewMut.isPending}
                          className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button onClick={() => reviewMut.mutate({ id: report.id, action: 'reject' })} disabled={reviewMut.isPending}
                          className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <div>
          {uLoading ? (
            <div className="text-center py-16"><Loader2 size={32} className="animate-spin text-primary-500 mx-auto" /></div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Role</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 hidden sm:table-cell">Joined</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(users as any[]).map((u: any) => (
                    <tr key={u.id} className={u.is_banned ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {u.name}
                        {u.is_banned && <span className="ml-2 text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Banned</span>}
                        {u.is_verified && <span className="ml-1 text-xs text-green-600">✓</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'contributor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => banMut.mutate({ id: u.id, ban: !u.is_banned })}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${u.is_banned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                          {u.role === 'user' && (
                            <button onClick={() => { promoteUser(u.id); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Promoted'); }}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-100 text-blue-700">
                              Promote
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Scammer Graph / Clusters ── */}
      {activeTab === 'clusters' && (
        <div className="space-y-6">
          {/* Manual linking tool */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <h3 className="font-bold text-purple-800 mb-1 flex items-center gap-2">
              <Link2 size={16} /> Manually Link Sellers into a Cluster
            </h3>
            <p className="text-xs text-purple-600 mb-4">
              Paste seller IDs separated by commas. All will be grouped — searching any one will reveal the others.
            </p>
            <div className="space-y-3">
              <input
                value={clusterLabel}
                onChange={e => setClusterLabel(e.target.value)}
                placeholder="Cluster label (optional) — e.g. 'iPhone Scammer Network'"
                className="w-full px-4 py-2 border border-purple-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
              />
              <div className="flex gap-2">
                <input
                  value={clusterIds}
                  onChange={e => setClusterIds(e.target.value)}
                  placeholder="seller-uuid-1, seller-uuid-2, seller-uuid-3"
                  className="flex-1 px-4 py-2 border border-purple-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white font-mono"
                />
                <button onClick={handleLinkCluster}
                  className="bg-purple-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 flex items-center gap-1">
                  <Plus size={14} /> Link
                </button>
              </div>
            </div>
          </div>

          {/* Existing clusters */}
          {cLoading ? (
            <div className="text-center py-16"><Loader2 size={32} className="animate-spin text-purple-500 mx-auto" /></div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Link2 size={36} className="mx-auto mb-3 text-gray-300" />
              <p>No scammer clusters yet.</p>
              <p className="text-xs mt-1">Clusters are created automatically when reports link multiple identifiers, or manually above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster: any) => (
                <div key={cluster.id} className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-purple-900 flex items-center gap-2">
                        <Link2 size={15} className="text-purple-500" />
                        {cluster.label || 'Unnamed Cluster'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ID: <span className="font-mono">{cluster.id.slice(0, 8)}...</span> · {cluster.member_count} linked seller{cluster.member_count !== 1 ? 's' : ''} · Created {formatDate(cluster.created_at)}
                      </p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {cluster.member_count} members
                    </span>
                  </div>

                  {/* Member sellers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(cluster.members || []).map((member: any) => (
                      <div key={member.id} className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {member.business_name || member.phone_number || member.tiktok_handle || 'Unknown'}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-500">
                            {member.phone_number    && <span>📱 {member.phone_number}</span>}
                            {member.till_number    && <span>🏪 {member.till_number}</span>}
                            {member.paybill_number && <span>🏦 {member.paybill_number}</span>}
                            {member.tiktok_handle  && <span>🎵 @{member.tiktok_handle}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-semibold ${member.trust_score < 31 ? 'text-red-600' : member.trust_score >= 86 ? 'text-green-600' : 'text-yellow-600'}`}>
                              Score: {member.trust_score}/100
                            </span>
                            <span className="text-xs text-gray-400">· {member.total_reports} reports</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCluster(member.id)}
                          title="Remove from cluster"
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Watchlist ── */}
      {activeTab === 'watchlist' && (
        <div>
          <p className="text-gray-500 text-sm mb-4">
            Identifiers searched many times with no database match — potential active scam ads.
          </p>
          {watchlist.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No flagged watchlist entries.</div>
          ) : (
            <div className="space-y-3">
              {watchlist.map((w: any) => (
                <div key={w.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center gap-4">
                  <div>
                    <p className="font-mono font-semibold text-gray-800">{w.searched_value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Type: {w.search_type} · Searches: {w.search_count} · Last: {formatDate(w.last_seen_at)}
                    </p>
                    {w.flag_reason && <p className="text-xs text-orange-600 mt-1">{w.flag_reason}</p>}
                  </div>
                  <Eye size={18} className="text-orange-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
