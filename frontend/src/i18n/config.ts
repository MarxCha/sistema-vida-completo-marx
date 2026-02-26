import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all ES namespace files
import commonES from './locales/es/common.json';
import authES from './locales/es/auth.json';
import dashboardES from './locales/es/dashboard.json';
import profileES from './locales/es/profile.json';
import directivesES from './locales/es/directives.json';
import representativesES from './locales/es/representatives.json';
import documentsES from './locales/es/documents.json';
import emergencyES from './locales/es/emergency.json';
import notificationsES from './locales/es/notifications.json';
import subscriptionES from './locales/es/subscription.json';
import adminES from './locales/es/admin.json';
import landingES from './locales/es/landing.json';
import extrasES from './locales/es/extras.json';

// Import all EN namespace files
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import profileEN from './locales/en/profile.json';
import directivesEN from './locales/en/directives.json';
import representativesEN from './locales/en/representatives.json';
import documentsEN from './locales/en/documents.json';
import emergencyEN from './locales/en/emergency.json';
import notificationsEN from './locales/en/notifications.json';
import subscriptionEN from './locales/en/subscription.json';
import adminEN from './locales/en/admin.json';
import landingEN from './locales/en/landing.json';
import extrasEN from './locales/en/extras.json';

export const defaultNS = 'common';
export const resources = {
  es: {
    common: commonES,
    auth: authES,
    dashboard: dashboardES,
    profile: profileES,
    directives: directivesES,
    representatives: representativesES,
    documents: documentsES,
    emergency: emergencyES,
    notifications: notificationsES,
    subscription: subscriptionES,
    admin: adminES,
    landing: landingES,
    extras: extrasES,
  },
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    profile: profileEN,
    directives: directivesEN,
    representatives: representativesEN,
    documents: documentsEN,
    emergency: emergencyEN,
    notifications: notificationsEN,
    subscription: subscriptionEN,
    admin: adminEN,
    landing: landingEN,
    extras: extrasEN,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vida-lang',
      caches: ['localStorage'],
    },
  });

// Sync HTML lang attribute on language change
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
