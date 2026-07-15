import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AlertTriangle, ExternalLink, Loader2, ChevronRight } from 'lucide-react';
import { timeAgo } from '../lib/utils';

// ── Platform definitions ──────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'facebook',  name: 'Facebook',    bg: 'bg-blue-600',   activeRing: 'ring-blue-600',   svg: <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { id: 'tiktok',    name: 'TikTok',      bg: 'bg-black',      activeRing: 'ring-gray-900',   svg: <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/></svg> },
  { id: 'instagram', name: 'Instagram',   bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400', activeRing: 'ring-pink-500', svg: <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  { id: 'whatsapp',  name: 'WhatsApp',    bg: 'bg-green-500',  activeRing: 'ring-green-500',  svg: <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
  { id: 'jiji',      name: 'Jiji',        bg: 'bg-orange-500', activeRing: 'ring-orange-500', svg: <span className="text-2xl">🛒</span> },
  { id: 'mpesa',     name: 'M-Pesa',      bg: 'bg-white border-2 border-gray-200', activeRing: 'ring-green-600', svg: (
    <div className="flex flex-col items-center leading-none">
      <span className="text-[10px] font-black text-green-700 tracking-tight">M-PESA</span>
      <div className="flex gap-0.5 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
        <span className="w-1.5 h-1.5 rounded-full bg-green-700 inline-block" />
      </div>
    </div>
  ) },
  { id: 'twitter',   name: 'X / Twitter', bg: 'bg-gray-900',   activeRing: 'ring-gray-700',   svg: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
];

// ── Fetch top reported profiles for a platform ────────────────────────────────
async function fetchPlatformPreviews(platformId: string, limit = 3) {
  // Map platform to the relevant search field
  const fieldMap: Record<string, string> = {
    tiktok:    'tiktok_handle',
    facebook:  'social_media_handle',
    instagram: 'social_media_handle',
    whatsapp:  'phone_number',
    twitter:   'social_media_handle',
    jiji:      'phone_number',
    mpesa:     'till_number',
  };
  const field = fieldMap[platformId] || 'phone_number';

  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, business_name, phone_number, till_number, tiktok_handle, social_media_handle, total_reports, status, created_at')
    .in('status', ['high_risk', 'blocked'])
    .not(field, 'is', null)
    .order('total_reports', { ascending: false })
    .limit(limit);

  if (!sellers || sellers.length === 0) return [];

  const results = [];
  for (const s of sellers) {
    const { data: report } = await supabase
      .from('reports')
      .select('category, description, created_at')
      .eq('seller_id', s.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    results.push({ ...s, latest_report: report });
  }
  return results;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const PlatformPreviewSection: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: previews = [], isLoading } = useQuery({
    queryKey: ['platform-preview', selected],
    queryFn:  () => selected ? fetchPlatformPreviews(selected) : Promise.resolve([]),
    enabled:  !!selected,
    staleTime: 1000 * 60 * 5,
  });

  const handleClick = (id: string) => {
    setSelected(prev => prev === id ? null : id); // toggle
  };

  return (
    <section className="bg-gray-50 border-y border-gray-100 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Where We Protect You</h2>
          <p className="text-gray-500 text-sm">Scammers, fake accounts & fraud on every platform — click to see alerts</p>
        </div>

        {/* Platform icons */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {PLATFORMS.map(({ id, name, bg, activeRing, svg }) => (
            <button
              key={id}
              onClick={() => handleClick(id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`${bg} w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all
                ${selected === id
                  ? `ring-3 ring-offset-2 ${activeRing} scale-110 shadow-md`
                  : 'group-hover:scale-110 group-hover:shadow-md'
                }`}
              >
                {svg}
              </div>
              <span className={`text-xs font-medium transition-colors ${
                selected === id ? 'text-primary-600' : 'text-gray-600 group-hover:text-primary-600'
              }`}>{name}</span>
            </button>
          ))}
        </div>

        {/* Preview panel — appears when a platform is selected */}
        {selected && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-500" />
                <span className="font-semibold text-gray-800 text-sm">
                  Recent reports on {PLATFORMS.find(p => p.id === selected)?.name}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
            </div>

            {/* Content */}
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading alerts...</span>
                </div>
              ) : previews.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-3">No reports found for this platform yet.</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link to="/report" className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                      Report a fraud on {PLATFORMS.find(p => p.id === selected)?.name}
                    </Link>
                    <Link
                      to={`/scam-alerts?platform=${selected}`}
                      className="inline-flex items-center justify-center gap-1 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      View all alerts <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {(previews as any[]).map((item: any) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                        {/* Status */}
                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full mt-0.5 ${
                          item.status === 'blocked' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {item.status === 'blocked' ? '🚫' : '🚨'}
                        </span>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {item.business_name || item.phone_number || item.tiktok_handle || item.social_media_handle || 'Unknown'}
                          </p>
                          {item.latest_report && (
                            <>
                              <p className="text-xs text-red-700 font-medium capitalize mt-0.5">
                                {item.latest_report.category?.replace(/_/g, ' ')}
                                <span className="text-gray-400 font-normal ml-2">{timeAgo(item.latest_report.created_at)}</span>
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.latest_report.description}</p>
                            </>
                          )}
                          <p className="text-xs text-red-500 mt-1">{item.total_reports} report{item.total_reports !== 1 ? 's' : ''}</p>
                        </div>
                        {/* Link */}
                        <Link to={`/seller/${item.id}`} className="shrink-0 text-primary-600 hover:text-primary-800">
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>

                  {/* View all — always visible */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Showing top 3 · {previews.length} found</span>
                    <Link
                      to={`/scam-alerts?platform=${selected}`}
                      className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"
                    >
                      View all {PLATFORMS.find(p => p.id === selected)?.name} alerts
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Default CTA when nothing selected */}
        {!selected && (
          <div className="text-center">
            <Link to="/scam-alerts" className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline">
              <AlertTriangle size={14} /> View all fraud alerts →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
