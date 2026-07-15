import { create } from 'zustand';
import { translations, type Language, type TranslationKey } from '../lib/i18n';

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: (localStorage.getItem('tg_lang') as Language) || 'en',

  setLang: (lang) => {
    localStorage.setItem('tg_lang', lang);
    set({ lang });
  },

  t: (key) => {
    const { lang } = get();
    return translations[lang][key] ?? translations.en[key] ?? key;
  },
}));
