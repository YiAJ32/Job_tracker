import { useI18n } from "./i18n";

function ThemeToggle({ theme, onToggle }) {
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span className="theme-toggle-label">{isDark ? t("theme.light") : t("theme.dark")}</span>
    </button>
  );
}

export default ThemeToggle;
