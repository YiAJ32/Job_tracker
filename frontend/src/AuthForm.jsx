import { useId, useState } from "react";
import { useI18n } from "./i18n";
import { PASSWORD_RULES, isValidPassword } from "./passwordRules";

const EMPTY_FORM = { nombre: "", email: "", password: "", codigo: "" };

// login → entrar · register → crear cuenta · verify → confirmar el email con el código
// forgot → pedir código para cambiar la contraseña · reset → código + contraseña nueva
const TITLES = {
  login: "auth.loginTitle",
  register: "auth.registerTitle",
  verify: "auth.verifyTitle",
  forgot: "auth.forgotTitle",
  reset: "auth.resetTitle",
};

const SUBMIT_LABELS = {
  login: "auth.submitLogin",
  register: "auth.submitRegister",
  verify: "auth.submitVerify",
  forgot: "auth.submitForgot",
  reset: "auth.submitReset",
};

function AuthForm({
  onLogin,
  onRegister,
  onVerify,
  onResend,
  onForgot,
  onReset,
  intro,
  className = "card",
  autoFocus = false,
}) {
  const { t } = useI18n();
  const id = useId();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_FORM);
  // Email al que se mandó el código y el texto que lo explica
  const [pendingEmail, setPendingEmail] = useState("");
  const [codeMessage, setCodeMessage] = useState("auth.verifySent");
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const usesCode = mode === "verify" || mode === "reset";
  const asksEmail = mode === "login" || mode === "register" || mode === "forgot";
  const asksPassword = mode !== "verify" && mode !== "forgot";
  const isNewPassword = isRegister || mode === "reset";

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "codigo" ? value.replace(/\D/g, "") : value }));
  }

  function startCodeStep(next, email, message) {
    setPendingEmail(email);
    setCodeMessage(message);
    setForm((f) => ({ ...f, codigo: "", password: next === "reset" ? "" : f.password }));
    setMode(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const email = form.email.trim().toLowerCase();
    if (isNewPassword && !isValidPassword(form.password)) {
      setError(t("auth.passwordInvalid"));
      setSubmitting(false);
      return;
    }
    try {
      if (mode === "verify") {
        await onVerify({ email: pendingEmail, codigo: form.codigo });
      } else if (mode === "reset") {
        await onReset({ email: pendingEmail, codigo: form.codigo, password: form.password });
      } else if (mode === "forgot") {
        await onForgot(email);
        startCodeStep("reset", email, "auth.resetSent");
      } else if (isRegister) {
        const response = await onRegister({ nombre: form.nombre, email, password: form.password });
        startCodeStep("verify", response.email, "auth.verifySent");
      } else {
        await onLogin({ email, password: form.password });
      }
    } catch (err) {
      // La cuenta existe pero no se confirmó: se pide un código nuevo y se pasa a confirmarlo
      if (mode === "login" && err.status === 403) {
        startCodeStep("verify", email, "auth.verifyUnconfirmed");
        onResend(email).catch(() => {});
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await (mode === "reset" ? onForgot(pendingEmail) : onResend(pendingEmail));
      setNotice(t("auth.codeResent"));
    } catch (err) {
      setError(err.message);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  let introText = intro ?? t("auth.defaultIntro");
  if (usesCode) introText = t(codeMessage, { email: pendingEmail });
  else if (mode === "forgot") introText = t("auth.forgotIntro");

  return (
    <section className={`${className} auth-card`}>
      <div className="card-header">
        <h2>{t(TITLES[mode])}</h2>
      </div>
      <p className="auth-intro">{introText}</p>

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
        {asksEmail && (
          <div className="field">
            <label htmlFor={`${id}-email`}>{t("auth.email")}</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              autoFocus={autoFocus || mode === "forgot"}
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
        )}
        {usesCode && (
          <div className="field">
            <label htmlFor={`${id}-codigo`}>{t("auth.code")}</label>
            <input
              id={`${id}-codigo`}
              name="codigo"
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              autoFocus
              value={form.codigo}
              onChange={handleChange}
              required
            />
          </div>
        )}
        {asksPassword && (
          <div className="field">
            <label htmlFor={`${id}-password`}>
              {mode === "reset" ? t("auth.newPassword") : t("auth.password")}
            </label>
            <input
              id={`${id}-password`}
              name="password"
              type="password"
              autoComplete={isNewPassword ? "new-password" : "current-password"}
              aria-describedby={isNewPassword ? `${id}-rules` : undefined}
              value={form.password}
              onChange={handleChange}
              required
            />
            {isNewPassword && (
              <ul id={`${id}-rules`} className="password-rules">
                {PASSWORD_RULES.map((rule) => {
                  const met = form.password !== "" && rule.test(form.password);
                  return (
                    <li key={rule.key} className={met ? "met" : undefined}>
                      <span aria-hidden="true">{met ? "✓" : "○"}</span> {t(rule.key)}
                    </li>
                  );
                })}
              </ul>
            )}
            {mode === "login" && (
              <button type="button" className="link-button auth-forgot" onClick={() => switchMode("forgot")}>
                {t("auth.forgotLink")}
              </button>
            )}
          </div>
        )}

        {notice && <p className="auth-notice">{notice}</p>}
        {error && <p className="error">{error}</p>}

        <div className="auth-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {t(SUBMIT_LABELS[mode])}
          </button>
          {usesCode && (
            <button type="button" className="link-button" onClick={handleResend}>
              {t("auth.resendCode")}
            </button>
          )}
          {mode === "login" || mode === "register" ? (
            <button
              type="button"
              className="link-button"
              onClick={() => switchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? t("auth.haveAccount") : t("auth.noAccount")}
            </button>
          ) : (
            <button type="button" className="link-button" onClick={() => switchMode("login")}>
              {t("auth.backToLogin")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default AuthForm;
