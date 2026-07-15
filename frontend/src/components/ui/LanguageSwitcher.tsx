import React from 'react';
import { useLangStore } from '../../store/langStore';

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLangStore();

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
          lang === 'en'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => setLang('sw')}
        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
          lang === 'sw'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Badili lugha Kiswahili"
      >
        SW
      </button>
    </div>
  );
};
