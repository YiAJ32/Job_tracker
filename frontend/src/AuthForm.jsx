import { useId, useState } from "react";

const EMPTY_FORM = { nombre: "", email: "", password: "" };

const DEFAULT_INTRO =
  "Iniciá sesión para agregar empresas, calificarlas y dejar notas. Sin cuenta podés ver lo que opinan los demás.";

function AuthForm({
  onLogin,
  onRegister,
  intro = DEFAULT_INTRO,
  className = "card",
  autoFocus = false,
}) {
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
        <h2>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h2>
      </div>
      <p className="auth-intro">{intro}</p>

      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <div className="field">
            <label htmlFor={`${id}-nombre`}>Nombre</label>
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
          <label htmlFor={`${id}-email`}>Email</label>
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
          <label htmlFor={`${id}-password`}>Contraseña</label>
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
          {isRegister && <span className="field-hint">Mínimo 8 caracteres</span>}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="auth-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {isRegister ? "Crear cuenta" : "Entrar"}
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
          >
            {isRegister ? "Ya tengo cuenta" : "No tengo cuenta, registrarme"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AuthForm;
