import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSellerById, getReviewsBySeller } from '../lib/db';
import { analyzeSellerRisk, type AIRiskAnalysis } from '../lib/aiEngine';
import { TrustMeter } from '../components/ui/TrustMeter';
import { TrustBadge } from '../components/ui/TrustBadge';
import { Loader2, AlertTriangle, Star, Brain, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';
import { formatCurrency, timeAgo } from '../lib/utils';

// ── AI Risk Factor Bar ────────────────────────────────────────────────────────
const RiskFactorRow: React.FC<{ factor: AIRiskAnalysis['factors'][0] }> = ({ factor }) => {
  const [expanded, setExpanded] = useState(false);
  const severityColors: Record<string, string> = {
    none: 'bg-green-500', low: 'bg-yellow-400', medium: 'bg-orange-400',
    high: 'bg-red-500', critical: 'bg-red-700',
  };
  const barColor = severityColors[factor.severity] || 'bg-gray-300';
  const weightPct = Math.round(factor.weight * 100);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-lg shrink-0">{factor.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-semibold text-gray-800 truncate">{factor.label}</span>
            <span className="text-xs text-gray-400 shrink-0">{weightPct}% weight</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${factor.score}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-gray-600 shrink-0 w-10 text-right">{factor.score}/100</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-600 leading-relaxed">{factor.explanation}</p>
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const SellerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller', id],
    queryFn:  () => getSellerById(id!),
    enabled:  !!id,
  });

  const { data: reviewData } = useQuery({
    queryKey: ['reviews', id],
    queryFn:  () => getReviewsBySeller(id!),
    enabled:  !!id,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={40} className="animate-spin text-primary-500" />
    </div>
  );
  if (!seller) return <div className="text-center py-24 text-gray-500">Seller not found.</div>;

  // Run full AI risk analysis in the browser
  const aiAnalysis = analyzeSellerRisk({
    trust_score:      seller.trust_score,
    total_reports:    seller.total_reports,
    approved_reports: seller.approved_reports ?? 0,
    is_verified:      seller.is_verified,
    created_at:       seller.created_at,
    recent_reports:   seller.recent_reports || [],
    avg_rating:       seller.avg_rating ?? null,
    total_reviews:    seller.total_reviews ?? 0,
  });

  const reviews     = reviewData?.reviews || [];
  const reviewStats = reviewData?.stats;

  const verdictBg: Record<string, string> = {
    'Likely Scam':           'bg-red-50 border-red-200',
    'Suspicious Activity':   'bg-orange-50 border-orange-200',
    'Proceed with Caution':  'bg-yellow-50 border-yellow-200',
    'Low Risk':              'bg-green-50 border-green-200',
  };
  const verdictBgClass = verdictBg[aiAnalysis.verdict] || 'bg-gray-50 border-gray-200';

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link to="/search" className="text-primary-600 hover:underline text-sm mb-6 inline-block">
        ← Back to Search
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="md:col-span-1 space-y-4">
          {/* Trust Meter */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <TrustMeter score={seller.trust_score} />
          </div>

          {/* Seller Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-800 text-lg">Seller Info</h2>
            {seller.phone_number    && <div className="flex justify-between text-sm"><span className="text-gray-500">Phone</span><span className="font-medium">{seller.phone_number}</span></div>}
            {seller.till_number    && <div className="flex justify-between text-sm"><span className="text-gray-500">Till Number</span><span className="font-medium">{seller.till_number}</span></div>}
            {seller.paybill_number && <div className="flex justify-between text-sm"><span className="text-gray-500">Paybill</span><span className="font-medium">{seller.paybill_number}</span></div>}
            {seller.tiktok_handle  && <div className="flex justify-between text-sm"><span className="text-gray-500">TikTok</span><span className="font-medium">@{seller.tiktok_handle}</span></div>}
            {seller.location       && <div className="flex justify-between text-sm"><span className="text-gray-500">Location</span><span className="font-medium">{seller.location}</span></div>}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Verified</span>
              <span className={seller.is_verified ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {seller.is_verified ? '✓ Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Reports</span>
              <span className="font-medium text-red-600">{seller.total_reports}</span>
            </div>
          </div>

          {/* Positives */}
          {aiAnalysis.positives.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <h3 className="font-bold text-green-800 text-sm mb-2 flex items-center gap-1">
                <CheckCircle size={14} /> Positive Signals
              </h3>
              <ul className="space-y-1">
                {aiAnalysis.positives.map((p, i) => (
                  <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                    <span className="mt-0.5">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Right Column ── */}
        <div className="md:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {seller.business_name || seller.phone_number || 'Unknown Seller'}
                </h1>
                <TrustBadge score={seller.trust_score} size="md" className="mt-2" />
              </div>
              <Link to={`/report?seller_id=${seller.id}`}
                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm shrink-0">
                Report Scam
              </Link>
            </div>
          </div>

          {/* ── AI Risk Analysis ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-4">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-white" />
                <h3 className="font-bold text-white">AI Risk Analysis</h3>
                <span className="ml-auto text-xs text-purple-200">Runs in your browser · No data sent externally</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Verdict banner */}
              <div className={`rounded-xl border p-4 ${verdictBgClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-xl font-extrabold ${aiAnalysis.verdictColor} mb-1`}>
                      {aiAnalysis.verdict}
                    </p>
                    <p className="text-sm text-gray-700">{aiAnalysis.summary}</p>
                  </div>
                  <div className="text-center shrink-0">
                    <div className={`text-3xl font-black ${aiAnalysis.verdictColor}`}>{aiAnalysis.overallScore}</div>
                    <div className="text-xs text-gray-500">risk score</div>
                  </div>
                </div>

                {/* Recommendation */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-start gap-2">
                  <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">{aiAnalysis.recommendation}</p>
                </div>
              </div>

              {/* Detected patterns */}
              {aiAnalysis.detectedPatterns.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">DETECTED PATTERNS</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnalysis.detectedPatterns.map(p => (
                      <span key={p} className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Factor breakdown */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">RISK FACTOR BREAKDOWN</p>
                <p className="text-xs text-gray-400 mb-3">Click any factor to see why it was scored this way.</p>
                <div className="space-y-2">
                  {aiAnalysis.factors.map(factor => (
                    <RiskFactorRow key={factor.id} factor={factor} />
                  ))}
                </div>
              </div>

              {/* Weight legend */}
              <div className="text-xs text-gray-400 flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700 inline-block" /> Critical (76–100)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> High (51–75)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Medium (26–50)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Low (1–25)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Clean (0)</span>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Recent Reports ({seller.approved_reports || 0})
            </h3>
            {seller.recent_reports && seller.recent_reports.slice(0, 5).length > 0 ? (
              <div className="space-y-4">
                {seller.recent_reports.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="border-l-4 border-red-400 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {r.category?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{r.description}</p>
                    {r.amount_lost && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        Lost: {formatCurrency(r.amount_lost, r.currency)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No approved reports yet.</p>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                Reviews ({reviewStats?.count || 0})
              </h3>
              {reviewStats?.avg_rating && (
                <span className="text-yellow-600 font-bold">
                  ★ {Number(reviewStats.avg_rating).toFixed(1)} / 5
                </span>
              )}
            </div>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rv: any) => (
                  <div key={rv.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-sm text-gray-800">{rv.reviewer_name || 'Anonymous'}</span>
                        <div className="flex gap-0.5 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} className={s <= rv.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(rv.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{rv.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No reviews yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
