import { LANGUAGES, useI18n } from "./i18n";

function LanguageSelect() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="language-select" title={t("app.language")}>
      <span aria-hidden="true">🌐</span>
      <select
        aria-label={t("app.language")}
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} lang={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSelect;
