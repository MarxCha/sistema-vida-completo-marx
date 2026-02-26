import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    ns: ['api', 'validation', 'notifications', 'emails'],
    defaultNS: 'api',
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
    },
    detection: {
      order: ['header'],
      lookupHeader: 'accept-language',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export { middleware as i18nMiddleware };
export default i18next;
