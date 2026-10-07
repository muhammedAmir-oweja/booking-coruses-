import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './ar.json'
import en from './en.json'
import { applyLocaleToDocument, readPrefs, writePrefsCookie, type Locale } from '../prefs'

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
 * Task 26's PreferencesProvider will own <html lang>/<html dir>. Until it
 * exists, i18n owns them - index.html ships `lang="en"`, so something has to
 * overwrite it at runtime either way.
 */
applyLocaleToDocument((i18n.resolvedLanguage ?? 'en') as Locale)

i18n.on('languageChanged', (lng) => {
  const locale = (lng === 'ar' ? 'ar' : 'en') as Locale
  applyLocaleToDocument(locale)
  writePrefsCookie({ locale })
})

export default i18n
