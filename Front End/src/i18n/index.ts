import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './ar.json'
import en from './en.json'
import { applyLocaleToDocument, readPrefs, type Locale } from '../prefs'

/**
 * The initial language comes from the same prefs cookie the backend reads, so
 * the UI and SetLocale always agree. No detector plugin is needed for that -
 * the cookie IS the detection. The detector only covers the first visit, when
 * there is no cookie yet, and is told not to cache: `prefs` is the one store.
 *
 * Keys are nested (`t('courses.title')`) throughout. Changing that convention
 * later means touching every call site, so it is settled here.
 */
const stored = readPrefs().locale

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: stored,                  // undefined hands the choice to the detector
    supportedLngs: ['en', 'ar'],
    fallbackLng: 'en',
    detection: { order: ['navigator'], caches: [] },
    interpolation: { escapeValue: false },   // React already escapes
  })

/**
 * Set <html lang>/<html dir> for the very first paint: index.html ships
 * `lang="en"`, and this module runs before React mounts.
 *
 * From then on PreferencesProvider owns lang, dir, data-theme AND the cookie -
 * it is the single writer, and it calls i18n.changeLanguage() itself. i18n
 * deliberately does not persist on languageChanged any more; two writers meant
 * the provider's React state could drift from the cookie.
 */
applyLocaleToDocument((i18n.resolvedLanguage ?? 'en') as Locale)

export default i18n
