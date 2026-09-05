import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(['vi', () => {}]);

function loadInitialLang() {
  try {
    const saved = localStorage.getItem('rps-card-game-lang');
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    // ignore (private mode / storage disabled)
  }
  return 'vi';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadInitialLang);

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem('rps-card-game-lang', next);
    } catch {
      // ignore
    }
  };

  return <LanguageContext.Provider value={[lang, setLang]}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
