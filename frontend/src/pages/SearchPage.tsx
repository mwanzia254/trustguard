import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, AlertTriangle, CheckCircle, Shield, Loader2, Link2, Eye, Brain } from 'lucide-react';
import { TrustBadge } from '../components/ui/TrustBadge';
import { SEARCH_TYPES, formatDate } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { analyzeSellerRisk } from '../lib/aiEngine';
import toast from 'react-hot-toast';

interface SellerResult {
  id: string;
  business_name: string;
  phone_number: string;
  till_number: string;
  paybill_number: string;
  tiktok_handle: string;
  trust_score: number;
  status: string;
  trust_label: string;
  total_reports: number;
  approved_reports: string;
  categories: string[];
  created_at: string;
  cluster_id?: string;
  _fuzzy_match?: boolean;
}

interface SearchResults {
  found: boolean;
  sellers: SellerResult[];
  fuzzy_sellers: SellerResult[];      // fuzzy / near-match results
  cluster_sellers: SellerResult[];    // scammer graph linked identifiers
  watchlist: {
    search_count: number;
    warning: string;
  } | null;
}

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [value, setValue] = useState(searchParams.get('value') || '');
  const [type, setType] = useState(searchParams.get('type') || 'phone');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  const doSearch = async (v: string, t: string) => {
    if (!v.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const { searchSellers } = await import('../lib/db');
      const data = await searchSellers(v, t as any, user?.id);
      setResults(data as any);
    } catch (err: any) {
      toast.error(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const v = searchParams.get('value');
    const t = searchParams.get('type');
    if (v && t) {
      setValue(v);
      setType(t);
      doSearch(v, t);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?value=${encodeURIComponent(value)}&type=${type}`);
    doSearch(value, type);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Verification</h1>
      <p className="text-gray-500 mb-8">Search any phone number, till, paybill, TikTok handle, or business name.</p>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 sm:w-52"
            aria-label="Search type"
          >
            {SEARCH_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={SEARCH_TYPES.find(t => t.value === type)?.value === 'tiktok' ? 'e.g. @seller_tiktok' : `Enter ${SEARCH_TYPES.find(t => t.value === type)?.label.toLowerCase()}...`}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 size={40} className="animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">Analyzing trust data...</p>
        </div>
      )}

      {/* ── Watchlist Warning (zero-match but flagged) ── */}
      {!loading && results && !results.found && results.watchlist && (
        <div className="bg-orange-50 border border-orange-300 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Eye size={20} className="text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-orange-800 text-lg mb-1">⚠️ Unrated — High Search Activity</p>
              <p className="text-orange-700 text-sm">{results.watchlist.warning}</p>
              <p className="text-orange-500 text-xs mt-2">
                Searched {results.watchlist.search_count} times recently with no database match.
                This may be linked to an active scam ad. Proceed with extreme caution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No results (and not watchlisted) */}
      {!loading && results && !results.found && !results.watchlist && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-green-800 mb-2">No Reports Found</h2>
          <p className="text-green-700 mb-6">
            "<strong>{value}</strong>" has no reports on ScamChek. This is a good sign, but always stay cautious.
          </p>
          <Link to="/report" className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
            Report This Seller
          </Link>
        </div>
      )}

      {/* ── Main Results ── */}
      {!loading && results && results.found && results.sellers.map((seller) => (
        <div key={seller.id} className={`rounded-2xl border shadow-sm p-6 mb-6 ${
          seller.trust_score < 31 ? 'bg-red-50 border-red-200' :
          seller.trust_score < 61 ? 'bg-yellow-50 border-yellow-200' :
          'bg-white border-gray-200'
        }`}>
          {/* Fuzzy match warning */}
          {seller._fuzzy_match && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-xl px-4 py-2 mb-4 text-xs text-yellow-800 flex items-center gap-2">
              <AlertTriangle size={14} />
              Similar handle found — this may be a variant used to evade detection
            </div>
          )}

          {/* Header — scammer identity */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              {/* Risk label — no score, just status */}
              <div className="flex items-center gap-2 mb-2">
                {seller.trust_score < 31 ? (
                  <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">🚨 SCAMMER</span>
                ) : seller.trust_score < 61 ? (
                  <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">⚠️ SUSPICIOUS</span>
                ) : (
                  <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">✅ CLEAN</span>
                )}
                {seller.cluster_id && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <Link2 size={10} /> Linked Network
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {seller.business_name || seller.phone_number || 'Unknown Seller'}
              </h2>
              <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-600">
                {seller.phone_number    && <span>📱 {seller.phone_number}</span>}
                {seller.till_number    && <span>🏪 Till: {seller.till_number}</span>}
                {seller.paybill_number && <span>🏦 Paybill: {seller.paybill_number}</span>}
                {seller.tiktok_handle  && <span>🎵 @{seller.tiktok_handle}</span>}
              </div>
            </div>
            {/* Report count — prominent */}
            <div className="shrink-0 text-center bg-white rounded-xl border border-red-200 px-4 py-2">
              <p className="text-2xl font-black text-red-600">{seller.approved_reports || seller.total_reports}</p>
              <p className="text-xs text-gray-500">scam report{(seller.approved_reports || seller.total_reports) !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* AI verdict — focus on WHY it's risky, not the number */}
          {(() => {
            const ai = analyzeSellerRisk({
              trust_score: seller.trust_score,
              total_reports: seller.total_reports,
              approved_reports: Number(seller.approved_reports ?? 0),
              is_verified: (seller as any).is_verified ?? false,
              created_at: seller.created_at,
              recent_reports: (seller as any).categories?.map((c: string) => ({ description: c, category: c, created_at: new Date().toISOString() })) || [],
              avg_rating: null,
              total_reviews: 0,
            });
            if (ai.verdict === 'Low Risk') return null;
            return (
              <div className="bg-white rounded-xl border border-red-200 p-3 mb-4">
                <p className="text-sm font-semibold text-red-700 mb-1">⚠️ {ai.verdict}</p>
                <p className="text-xs text-gray-600">{ai.summary}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">{ai.recommendation}</p>
              </div>
            );
          })()}

          {/* Complaint categories */}
          {seller.categories && seller.categories.filter(Boolean).length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} className="text-orange-500" />
                What victims reported:
              </p>
              <div className="flex flex-wrap gap-2">                {seller.categories.filter(Boolean).map((cat) => (
                  <span key={cat} className="bg-red-50 text-red-700 text-xs px-3 py-1 rounded-full border border-red-200">
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            <Link to={`/seller/${seller.id}`} className="bg-primary-600 text-white px-5 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
              View Full Profile
            </Link>
            <Link to={`/report?seller_id=${seller.id}`} className="border border-red-300 text-red-600 px-5 py-2 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">
              Report This Seller
            </Link>
          </div>
        </div>
      ))}

      {/* ── Fuzzy Matches ── */}
      {!loading && results && results.fuzzy_sellers && results.fuzzy_sellers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-yellow-600" />
            <h3 className="font-bold text-yellow-800">
              🔍 Similar Handles Found — Possible Evasion Attempt
            </h3>
          </div>
          <p className="text-xs text-yellow-700 mb-4">
            These identifiers are very similar to your search — scammers often swap letters 
            (e.g. <span className="font-mono">@se11er</span> instead of <span className="font-mono">@seller</span>) 
            to bypass clean searches. Check these too.
          </p>
          <div className="space-y-3">
            {results.fuzzy_sellers.map((seller) => (
              <div key={seller.id} className="bg-white rounded-xl p-4 border border-yellow-100 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {seller.business_name || seller.phone_number || seller.tiktok_handle || 'Similar Seller'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                    {seller.phone_number   && <span>📱 {seller.phone_number}</span>}
                    {seller.till_number   && <span>🏪 {seller.till_number}</span>}
                    {seller.tiktok_handle && <span>🎵 @{seller.tiktok_handle}</span>}
                    {(seller as any).social_media_handle && <span>📲 @{(seller as any).social_media_handle}</span>}
                    {(seller as any)._fuzzy_score && (
                      <span className="text-yellow-600 font-medium">
                        {Math.round((seller as any)._fuzzy_score * 100)}% similar
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <TrustBadge score={seller.trust_score} size="sm" showScore={false} />
                  <Link to={`/seller/${seller.id}`} className="text-xs text-primary-600 hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature 1: Scammer Graph — Linked Identifiers ── */}      {!loading && results && results.cluster_sellers && results.cluster_sellers.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={18} className="text-purple-600" />
            <h3 className="font-bold text-purple-800">
              🕸️ Linked Network — Other Identifiers from the Same Scammer
            </h3>
          </div>
          <p className="text-sm text-purple-600 mb-4">
            Reports have linked these additional identifiers to the same scammer. Searching any one reveals the risk of all.
          </p>
          <div className="space-y-3">
            {results.cluster_sellers.map((linked) => (
              <div key={linked.id} className="bg-white rounded-xl p-4 border border-purple-100 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {linked.business_name || linked.phone_number || linked.tiktok_handle || 'Linked Seller'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                    {linked.phone_number    && <span>📱 {linked.phone_number}</span>}
                    {linked.till_number    && <span>🏪 Till: {linked.till_number}</span>}
                    {linked.tiktok_handle  && <span>🎵 @{linked.tiktok_handle}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <TrustBadge score={linked.trust_score} size="sm" showScore={false} />
                  <Link to={`/seller/${linked.id}`} className="text-xs text-primary-600 hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
