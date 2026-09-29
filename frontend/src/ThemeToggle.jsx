function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-pressed={isDark}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo nocturno"}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span className="theme-toggle-label">{isDark ? "Claro" : "Nocturno"}</span>
    </button>
  );
}

export default ThemeToggle;
