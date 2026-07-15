import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Search, Shield, Loader2, ExternalLink } from 'lucide-react';
import { formatDate, timeAgo } from '../lib/utils';

// Platform definitions
const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    searchType: 'social_media',
    keywords: ['facebook', 'fb.com', 'facebook.com'],
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50 border-blue-200 text-blue-700',
    svg: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    description: 'Facebook Marketplace & Groups scams',
    tip: 'Common fraud: fake marketplace listings, advance payment requests, fake accounts impersonating real people, non-delivery of goods.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    searchType: 'tiktok',
    keywords: ['tiktok', '@'],
    color: 'bg-black',
    lightColor: 'bg-gray-50 border-gray-300 text-gray-700',
    svg: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/></svg>,
    description: 'TikTok LIVE, Shop & fake account fraud',
    tip: 'Common fraud: fake TikTok Shop sellers, LIVE sale fraud, fake accounts using stolen videos, catfishing, "DM to order" scams.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    searchType: 'social_media',
    keywords: ['instagram', 'insta', 'ig'],
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    lightColor: 'bg-pink-50 border-pink-200 text-pink-700',
    svg: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    description: 'Instagram seller, fake account & DM fraud',
    tip: 'Common fraud: fake fashion/gadget sellers, romance scams, fake giveaways, impersonation of celebrities or brands.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    searchType: 'phone',
    keywords: ['whatsapp', 'wa'],
    color: 'bg-green-500',
    lightColor: 'bg-green-50 border-green-200 text-green-700',
    svg: <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    description: 'WhatsApp seller & impersonation fraud',
    tip: 'Common fraud: advance payment requests, fake receipts, impersonating known contacts, romance scams, disappearing after payment.',
  },
  {
    id: 'jiji',
    name: 'Jiji',
    searchType: 'phone',
    keywords: ['jiji'],
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50 border-orange-200 text-orange-700',
    svg: <span className="text-2xl">🛒</span>,
    description: 'Jiji.co.ke marketplace & fake listings',
    tip: 'Common fraud: fake electronics listings, advance payment for delivery, counterfeit goods, fake seller profiles.',
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    searchType: 'till_number',
    keywords: ['till', 'paybill', 'mpesa'],
    color: 'bg-white border-2 border-gray-200',
    lightColor: 'bg-green-50 border-green-200 text-green-800',
    svg: (
      <div className="flex flex-col items-center leading-none">
        <span className="text-[10px] font-black text-green-700 tracking-tight">M-PESA</span>
        <div className="flex gap-0.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
          <span className="w-1.5 h-1.5 rounded-full bg-green-700 inline-block" />
        </div>
      </div>
    ),
    description: 'Fraudulent M-Pesa till & paybill numbers',
    tip: 'Common scams: fake till numbers, paybill fraud, fake M-Pesa confirmation screenshots.',
  },
];

async function fetchRecentScamsBySeller(limit = 20) {
  // Get high-risk sellers with approved reports
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, business_name, phone_number, till_number, tiktok_handle, social_media_handle, trust_score, status, total_reports, created_at')
    .in('status', ['high_risk', 'blocked'])
    .order('total_reports', { ascending: false })
    .limit(limit);

  if (!sellers) return [];

  // For each seller, get their latest report
  const results = [];
  for (const seller of sellers.slice(0, 12)) {
    const { data: reports } = await supabase
      .from('reports')
      .select('category, description, amount_lost, currency, created_at')
      .eq('seller_id', seller.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1);

    results.push({
      ...seller,
      latest_report: reports?.[0] || null,
    });
  }

  return results;
}

export const ScamAlertsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const platformParam = searchParams.get('platform') || 'all';
  const [activePlatform, setActivePlatform] = useState(platformParam);

  const { data: scammersRaw = [], isLoading } = useQuery({
    queryKey: ['scam-alerts'],
    queryFn:  () => fetchRecentScamsBySeller(20),
    staleTime: 1000 * 60 * 5,
  });
  const scammers = scammersRaw as any[];

  const activePlat = PLATFORMS.find(p => p.id === activePlatform);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
          <AlertTriangle size={24} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">🚨 Fraud & Scam Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">Real reports of scammers, fake accounts, impersonation & fraud — updated in real time</p>
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActivePlatform('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
            activePlatform === 'all'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          🌐 All Platforms
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              activePlatform === p.id
                ? `${p.lightColor} border-current`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            <span className={`w-5 h-5 rounded-md ${p.color} flex items-center justify-center shrink-0`}>
              <span className="scale-50">{p.svg}</span>
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Platform tip banner */}
      {activePlat && (
        <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${activePlat.lightColor}`}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{activePlat.description}</p>
            <p className="text-xs mt-0.5 opacity-80">{activePlat.tip}</p>
          </div>
        </div>
      )}

      {/* Scammer list */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 size={36} className="animate-spin text-primary-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading latest scam alerts...</p>
        </div>
      ) : scammers.length === 0 ? (
        <div className="text-center py-16">
          <Shield size={48} className="text-green-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No high-risk sellers found yet.</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to report a scam.</p>
          <Link to="/report" className="mt-4 inline-block bg-red-600 text-white px-5 py-2 rounded-xl hover:bg-red-700 font-medium text-sm">
            Report a Scam
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {scammers.map((scammer: any) => (
            <div key={scammer.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  {/* Status badge — no score */}
                  <div className="mb-1.5">
                    {scammer.status === 'blocked' ? (
                      <span className="bg-gray-900 text-white text-xs font-bold px-2.5 py-1 rounded-full">🚫 BLOCKED SCAMMER</span>
                    ) : (
                      <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">🚨 REPORTED SCAMMER</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 truncate">
                    {scammer.business_name || scammer.phone_number || scammer.tiktok_handle || 'Unknown Scammer'}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
                    {scammer.phone_number    && <span>📱 {scammer.phone_number}</span>}
                    {scammer.till_number    && <span>🏪 Till: {scammer.till_number}</span>}
                    {scammer.tiktok_handle  && <span>🎵 @{scammer.tiktok_handle}</span>}
                    {scammer.social_media_handle && <span>📲 @{scammer.social_media_handle}</span>}
                  </div>
                </div>
                {/* Report count bubble */}
                <div className="shrink-0 bg-red-100 border border-red-200 rounded-xl px-3 py-2 text-center">
                  <p className="text-xl font-black text-red-600">{scammer.total_reports}</p>
                  <p className="text-[10px] text-red-500 font-medium">reports</p>
                </div>
              </div>

              {/* Latest report excerpt */}
              {scammer.latest_report && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-red-700 mb-1 capitalize">
                    {scammer.latest_report.category?.replace(/_/g, ' ')}
                    <span className="font-normal text-red-500 ml-2">{timeAgo(scammer.latest_report.created_at)}</span>
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">{scammer.latest_report.description}</p>
                  {scammer.latest_report.amount_lost && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Lost: {scammer.latest_report.currency} {Number(scammer.latest_report.amount_lost).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/seller/${scammer.id}`}
                  className="flex-1 text-center bg-primary-600 text-white text-xs py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-1"
                >
                  <ExternalLink size={12} /> View Profile
                </Link>
                <Link
                  to={`/search?value=${encodeURIComponent(scammer.phone_number || scammer.tiktok_handle || scammer.business_name || '')}&type=${scammer.tiktok_handle ? 'tiktok' : scammer.phone_number ? 'phone' : 'business_name'}`}
                  className="flex-1 text-center border border-gray-200 text-gray-600 text-xs py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-1"
                >
                  <Search size={12} /> Search
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report CTA */}
      <div className="mt-10 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl p-6 text-white text-center">
        <h3 className="text-xl font-bold mb-2">Know a scammer not listed here?</h3>
        <p className="text-red-100 text-sm mb-4">Submit a report and protect the next person.</p>
        <Link to="/report" className="inline-block bg-white text-red-700 font-bold px-6 py-2.5 rounded-xl hover:bg-red-50 transition-colors">
          Report a Scam
        </Link>
      </div>
    </div>
  );
};
