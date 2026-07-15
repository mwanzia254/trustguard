import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Search, AlertTriangle, CheckCircle, TrendingUp, Users, MessageCircle, Info } from 'lucide-react';
import { SEARCH_TYPES } from '../lib/utils';
import { useLangStore } from '../store/langStore';
import { PlatformPreviewSection } from '../components/PlatformPreviewSection';

export const HomePage: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState('phone');
  const navigate = useNavigate();
  const { t } = useLangStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    navigate(`/search?value=${encodeURIComponent(searchValue)}&type=${searchType}`);
  };

  const getPlaceholder = () => {
    const map: Record<string, string> = {
      phone: t('ph_phone'), till_number: t('ph_till'),
      paybill: t('ph_paybill'), business_name: t('ph_business'),
      tiktok: t('ph_tiktok'), social_media: t('ph_social'),
      website: t('ph_website'),
    };
    return map[searchType] || '';
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          {/* Kenya flag colours accent */}
          <div className="flex justify-center gap-1 mb-6">
            <span className="w-8 h-1.5 bg-black rounded" />
            <span className="w-8 h-1.5 bg-red-600 rounded" />
            <span className="w-8 h-1.5 bg-green-500 rounded" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="relative bg-white/10 rounded-full p-5 backdrop-blur-sm">
              <Shield size={52} style={{ color: '#c8956c' }} />
              <span className="absolute bottom-3 right-3 bg-white/20 rounded-full p-1">
                <Search size={18} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
          </div>
          <div className="flex justify-center mb-3">
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-blue-300 opacity-80">
              Trust · Verify · Report
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 leading-tight break-words">
            Is this seller a scammer?
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-2xl mx-auto px-2">
            Search any phone number, M-Pesa till, TikTok handle or business name — see real scam reports from victims before you send money.
          </p>

          {/* Search box */}
          <form onSubmit={handleSearch} className="bg-white rounded-2xl p-3 sm:p-4 shadow-2xl max-w-3xl mx-auto">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 sm:w-44 text-sm"
                  aria-label="Search type"
                >
                  {SEARCH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={getPlaceholder()}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm min-w-0"
                  aria-label="Search value"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto sm:self-end bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Search size={18} />
                {t('hero_search_btn')}
              </button>
            </div>
          </form>

          <p className="text-blue-200 text-sm mt-4">{t('hero_free')}</p>
          <div className="mt-3">
            <Link to="/how-it-works" className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition-colors underline underline-offset-2">
              <Info size={13} />
              How does ScamChek work?
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Search,        value: '230K+',  label: t('stat_searches'), color: 'text-blue-600' },
              { icon: AlertTriangle, value: '12.5K+', label: t('stat_reported'), color: 'text-red-500' },
              { icon: Shield,        value: '850+',   label: t('stat_scams'),    color: 'text-yellow-500' },
              { icon: Users,         value: '45K+',   label: t('stat_members'),  color: 'text-green-600' },
            ].map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="p-4">
                <Icon size={28} className={`mx-auto mb-2 ${color}`} />
                <p className="text-3xl font-extrabold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('how_title')}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: t('step1_title'), desc: t('step1_desc'), icon: Search,      color: 'bg-blue-50 text-blue-600' },
            { step: '2', title: t('step2_title'), desc: t('step2_desc'), icon: TrendingUp,  color: 'bg-yellow-50 text-yellow-600' },
            { step: '3', title: t('step3_title'), desc: t('step3_desc'), icon: CheckCircle, color: 'bg-green-50 text-green-600' },
          ].map(({ step, title, desc, icon: Icon, color }) => (
            <div key={step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-md transition-shadow">
              <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center mx-auto mb-4`}>
                <Icon size={26} />
              </div>
              <div className="text-5xl font-extrabold text-gray-100 -mb-4">{step}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms we cover — with inline preview */}
      <PlatformPreviewSection />

      {/* WhatsApp feature */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white/20 rounded-full p-4 shrink-0">
            <MessageCircle size={36} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">{t('wa_title')}</h3>
            <p className="text-green-100 mb-1">{t('wa_desc')}</p>
          </div>
          <Link
            to="/whatsapp"
            className="bg-white text-green-700 font-bold px-6 py-3 rounded-xl hover:bg-green-50 transition-colors shrink-0"
          >
            {t('wa_btn')}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700 text-white text-center py-16 px-4">
        <h2 className="text-3xl font-bold mb-2">Protect Your Community</h2>
        <p className="text-blue-100 mb-2 max-w-xl mx-auto">
          ScamChek is not just about money scams. We expose:
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-6 text-sm">
          {['💰 Payment Fraud', '👤 Fake Accounts', '💔 Romance Scams', '🪪 Identity Theft', '📦 Fake Products', '💼 Job Scams', '🛍️ Fake Businesses'].map(item => (
            <span key={item} className="bg-white/15 px-3 py-1 rounded-full">{item}</span>
          ))}
        </div>
        <p className="text-blue-200 text-sm mb-8 max-w-xl mx-auto">
          Join thousands of Kenyans reporting fraud and warning each other online.
        </p>
        <a href="/register" className="inline-block bg-white text-primary-700 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors text-lg">
          Join ScamChek Free
        </a>
      </section>
    </div>
  );
};
