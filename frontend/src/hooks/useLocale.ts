import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * Hook for locale-aware date and number formatting.
 * Replaces hardcoded toLocaleDateString('es-MX') calls.
 */
export function useLocale() {
  const { i18n } = useTranslation();

  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX';

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, options || {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [locale]);

  const formatDateTime = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const formatTime = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const formatNumber = useCallback((num: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(num);
  }, [locale]);

  const formatCurrency = useCallback((amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }, [locale]);

  return {
    locale,
    formatDate,
    formatDateTime,
    formatTime,
    formatNumber,
    formatCurrency,
  };
}
