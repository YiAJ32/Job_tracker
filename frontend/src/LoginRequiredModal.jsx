import { useEffect } from "react";
import AuthForm from "./AuthForm";

function LoginRequiredModal({ auth, title = "Iniciá sesión para comentar", message, onClose }) {
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
        <button type="button" className="cv-modal-close login-modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <div className="login-modal-icon" aria-hidden="true">🔒</div>
        <h2 id="login-modal-title">{title}</h2>
        {message && <p className="login-modal-text">{message}</p>}
        <AuthForm
          className="login-modal-form"
          onLogin={auth.login}
          onRegister={auth.register}
          intro="Si no tenés cuenta, podés crear una en un minuto."
          autoFocus
        />
      </div>
    </div>
  );
}

export default LoginRequiredModal;
