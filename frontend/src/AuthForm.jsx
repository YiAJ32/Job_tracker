import { useId, useState } from "react";
import { useI18n } from "./i18n";

const EMPTY_FORM = { nombre: "", email: "", password: "" };

function AuthForm({
  onLogin,
  onRegister,
  intro,
  className = "card",
  autoFocus = false,
}) {
  const { t } = useI18n();
  const id = useId();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(form);
      } else {
        await onLogin({ email: form.email, password: form.password });
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  return (
    <section className={`${className} auth-card`}>
      <div className="card-header">
        <h2>{isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}</h2>
      </div>
      <p className="auth-intro">{intro ?? t("auth.defaultIntro")}</p>

      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <div className="field">
            <label htmlFor={`${id}-nombre`}>{t("auth.name")}</label>
            <input
              id={`${id}-nombre`}
              name="nombre"
              autoComplete="name"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-email`}>{t("auth.email")}</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            autoFocus={autoFocus}
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-password`}>{t("auth.password")}</label>
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            value={form.password}
            onChange={handleChange}
            required
          />
          {isRegister && <span className="field-hint">{t("auth.passwordHint")}</span>}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="auth-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {isRegister ? t("auth.submitRegister") : t("auth.submitLogin")}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
          >
            {isRegister ? t("auth.haveAccount") : t("auth.noAccount")}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AuthForm;
