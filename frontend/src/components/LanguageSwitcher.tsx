import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'es';

  const toggleLanguage = () => {
    const newLang = currentLang === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
    // Update HTML lang attribute
    document.documentElement.lang = newLang;
    // Persist to localStorage (handled by i18next detector, but also explicit)
    localStorage.setItem('vida-lang', newLang);
  };

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-colors hover:bg-gray-100 ${className}`}
        title={currentLang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        <span className="text-base">{currentLang === 'es' ? '🇲🇽' : '🇺🇸'}</span>
        <span className="uppercase">{currentLang}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50 ${className}`}
      title={currentLang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <span className="text-base">{currentLang === 'es' ? '🇲🇽' : '🇺🇸'}</span>
      <span>{currentLang === 'es' ? 'ES' : 'EN'}</span>
    </button>
  );
}
