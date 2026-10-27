import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en";
import es from "./locales/es";
import pt from "./locales/pt";

// Los nombres se muestran en su propio idioma para que cualquiera encuentre el suyo
export const LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
];

const DICTIONARIES = { es, en, pt };
const DEFAULT_LANGUAGE = "es";
const STORAGE_KEY = "jt-language";

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored in DICTIONARIES ? stored : null;
  } catch {
    return null;
  }
}

function browserLanguage() {
  const preferred = navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const code = tag?.slice(0, 2).toLowerCase();
    if (code in DICTIONARIES) return code;
  }
  return DEFAULT_LANGUAGE;
}

// Idioma actual a nivel de módulo, para el código que no es un componente (api.js, extractCvText.js)
let currentLanguage = readStoredLanguage() ?? browserLanguage();

export function getLanguage() {
  return currentLanguage;
}

function lookup(language, key) {
  return DICTIONARIES[language]?.[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key];
}

// t("rating.reviews", { count: 2 }) elige "rating.reviews.one" u "rating.reviews.other"
export function translate(language, key, vars) {
  let text = lookup(language, key);
  if (text === undefined && vars?.count !== undefined) {
    text = lookup(language, `${key}.${vars.count === 1 ? "one" : "other"}`);
  }
  if (text === undefined) return key;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name) => vars[name] ?? match) : text;
}

export function t(key, vars) {
  return translate(currentLanguage, key, vars);
}

export function hasTranslation(key) {
  return lookup(currentLanguage, key) !== undefined;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(currentLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (!(code in DICTIONARIES)) return;
    currentLanguage = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Sin localStorage la elección dura hasta recargar
    }
    setLanguageState(code);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      formatDate: (date, options = { dateStyle: "medium" }) =>
        date ? new Date(date).toLocaleDateString(language, options) : "-",
    }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

// Los estados vienen de la base en español; se traducen por su forma normalizada
export function statusKey(nombre) {
  return `status.${(nombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")}`;
}

export function useStatusLabel() {
  const { t } = useI18n();
  return (nombre) => {
    const key = statusKey(nombre);
    const text = t(key);
    return text === key ? nombre : text;
  };
}
