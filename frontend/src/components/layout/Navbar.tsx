import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Search, Menu, X, User, LogOut, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLangStore } from '../../store/langStore';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { t } = useLangStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 font-bold text-xl">
            <span className="relative flex items-center shrink-0">
              <Shield size={26} style={{ color: '#c8956c' }} />
              <Search size={12} className="absolute bottom-0 right-0 text-primary-600" strokeWidth={2.5} />
            </span>
            <span className="text-primary-700">Scam</span>
            <span style={{ color: '#c8956c' }}>Chek</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-5">
            <Link to="/" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
              {t('nav_home')}
            </Link>
            <Link to="/how-it-works" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
              How It Works
            </Link>
            <Link to="/search" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
              {t('nav_search')}
            </Link>
            <Link to="/report" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
              {t('nav_report')}
            </Link>
            <Link to="/whatsapp" className="text-gray-600 hover:text-primary-600 font-medium transition-colors flex items-center gap-1 text-sm">
              <MessageCircle size={13} className="text-green-500" />
              {t('nav_whatsapp')}
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
                {t('nav_admin')}
              </Link>
            )}
          </div>

          {/* Auth buttons + Language switcher */}
          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/dashboard" className="flex items-center gap-1 text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
                  <User size={15} />
                  {user?.name?.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1 text-gray-500 hover:text-red-600 transition-colors text-sm">
                  <LogOut size={15} />
                  {t('nav_logout')}
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium transition-colors text-sm">
                  {t('nav_login')}
                </Link>
                <Link to="/register" className="bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 font-medium transition-colors text-sm">
                  {t('nav_register')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile/tablet menu button — shows below lg */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 py-3 px-4 space-y-2">
          <div className="pb-2"><LanguageSwitcher /></div>
          <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">{t('nav_home')}</Link>
          <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">How It Works</Link>
          <Link to="/search" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">{t('nav_search')}</Link>
          <Link to="/report" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">{t('nav_report')}</Link>
          <Link to="/whatsapp" onClick={() => setMenuOpen(false)} className="block py-2 text-green-600 font-medium flex items-center gap-1"><MessageCircle size={14} />{t('nav_whatsapp')}</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">{t('nav_dashboard')}</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block py-2 text-red-600 font-medium w-full text-left">{t('nav_logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 font-medium">{t('nav_login')}</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-primary-600 font-semibold">{t('nav_register')}</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
