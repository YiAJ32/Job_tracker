import { useEffect } from "react";
import AuthForm from "./AuthForm";
import { useI18n } from "./i18n";

function LoginRequiredModal({ auth, title, message, onClose }) {
  const { t } = useI18n();
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="cv-modal-overlay" onClick={onClose}>
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="cv-modal-close login-modal-close" onClick={onClose} aria-label={t("common.close")}>
          ✕
        </button>
        <div className="login-modal-icon" aria-hidden="true">🔒</div>
        <h2 id="login-modal-title">{title ?? t("auth.modalTitle")}</h2>
        {message && <p className="login-modal-text">{message}</p>}
        <AuthForm
          className="login-modal-form"
          onLogin={auth.login}
          onRegister={auth.register}
          intro={t("auth.modalIntro")}
          autoFocus
        />
      </div>
    </div>
  );
}

export default LoginRequiredModal;
