import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

const languages = [
  { code: 'es', label: 'Español', shortLabel: 'ES', flag: '🇲🇽' },
  { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
];

export default function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [justChanged, setJustChanged] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';
  const current = languages.find((l) => l.code === currentLang) || languages[0];

  const changeLanguage = (code: string) => {
    if (code === currentLang) {
      setOpen(false);
      return;
    }
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
    localStorage.setItem('vida-lang', code);
    setOpen(false);
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 1500);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium transition-all hover:bg-gray-100 ${justChanged ? 'ring-2 ring-vida-400 ring-opacity-50' : ''} ${className}`}
          aria-label={currentLang === 'es' ? 'Change language' : 'Cambiar idioma'}
          aria-expanded={open}
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase">{current.shortLabel}</span>
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                  lang.code === currentLang
                    ? 'bg-vida-50 text-vida-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.label}</span>
                {lang.code === currentLang && (
                  <Check className="w-4 h-4 text-vida-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all hover:bg-gray-50 ${justChanged ? 'ring-2 ring-vida-400 ring-opacity-50' : ''} ${className}`}
        aria-label={currentLang === 'es' ? 'Change language' : 'Cambiar idioma'}
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span>{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors ${
                lang.code === currentLang
                  ? 'bg-vida-50 text-vida-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {lang.code === currentLang && (
                <Check className="w-4 h-4 text-vida-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
