import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Search, MessageCircle } from 'lucide-react';
import { useLangStore } from '../../store/langStore';

export const Footer: React.FC = () => {
  const { t } = useLangStore();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Brand */}
          <div>
            {/* Logo — text fallback if image missing */}
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex items-center">
                <Shield size={26} style={{ color: '#c8956c' }} />
                <Search size={12} className="absolute bottom-0 right-0 text-primary-400" strokeWidth={2.5} />
              </span>
              <span className="font-bold text-xl text-white">
                Scam<span style={{ color: '#c8956c' }}>Chek</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Kenya's community platform to expose scammers, fake accounts, and online fraud.
            </p>
            <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-4">
              Trust · Verify · Report
            </p>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1 bg-black rounded" />
              <span className="w-5 h-1 bg-red-600 rounded" />
              <span className="w-5 h-1 bg-green-500 rounded" />
              <span className="text-xs text-gray-500 ml-1">🇰🇪 Made for Kenya</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/how-it-works"  className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/scam-alerts"   className="hover:text-white transition-colors">🚨 Scam Alerts</Link></li>
              <li><Link to="/search"        className="hover:text-white transition-colors">Search a Seller</Link></li>
              <li><Link to="/report"        className="hover:text-white transition-colors">Report a Scam</Link></li>
              <li>
                <Link to="/whatsapp" className="hover:text-white transition-colors flex items-center gap-1">
                  <MessageCircle size={12} /> WhatsApp Analyzer
                </Link>
              </li>
            </ul>
          </div>

          {/* Account + Info */}
          <div>
            <h4 className="text-white font-semibold mb-3">Account</h4>
            <ul className="space-y-2 text-sm mb-6">
              <li><Link to="/login"    className="hover:text-white transition-colors">{t('nav_login')}</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">{t('nav_register')}</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">My Dashboard</Link></li>
            </ul>
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-3 text-xs text-red-300">
              <p className="font-semibold mb-1">⚠️ Scam Alert</p>
              <p>Always check a seller on ScamChek before sending any M-Pesa payment.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-gray-500">
          <span>© {new Date().getFullYear()} ScamChek Kenya. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <span>Nairobi, Kenya 🇰🇪</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
