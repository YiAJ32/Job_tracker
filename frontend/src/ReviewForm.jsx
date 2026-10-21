import { useEffect, useRef, useState } from "react";
import { listReviews, saveMyReview } from "./api";
import LoginRequiredModal from "./LoginRequiredModal";
import StarRating from "./StarRating";

export const VERIFICATION_OPTIONS = [
  { value: "", label: "No sé" },
  { value: "existe", label: "✓ Existe" },
  { value: "fantasma", label: "👻 Fantasma" },
];

const EMPTY_REVIEW = { calificacion: null, notas: "", verificacion: "" };

// Formulario solo para reseñas nuevas; las propias se editan desde la lista de reseñas
function ReviewForm({ companies, companyId, onCompanyChange, auth, onSaved }) {
  const { user } = auth;
  const [form, setForm] = useState(EMPTY_REVIEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Un invitado tocó "Publicar reseña": al iniciar sesión se publica lo que ya escribió
  const pendingPublish = useRef(false);

  const company = companies.find((c) => c.id === companyId);

  useEffect(() => {
    if (!user || !pendingPublish.current) return;
    pendingPublish.current = false;
    publish();
  }, [user?.id]);

  // Sin sesión se puede completar la reseña; el login se pide recién al publicar
  function handleSave(e) {
    e.preventDefault();
    if (!user) {
      pendingPublish.current = true;
      setShowLoginModal(true);
      return;
    }
    publish();
  }

  function closeLoginModal() {
    pendingPublish.current = false;
    setShowLoginModal(false);
  }

  async function publish() {
    if (!companyId) {
      setError("Elegí la empresa sobre la que querés opinar");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // El backend reemplaza la reseña existente; acá no se pisa una anterior sin querer
      const reviews = await listReviews(companyId);
      if (reviews.some((r) => r.user_id === user.id)) {
        setError(
          `Ya dejaste una reseña sobre ${company?.nombre ?? "esta empresa"}. ` +
            "Podés cambiarla con el botón Editar en la lista de reseñas."
        );
        await onSaved(companyId);
        return;
      }
      await saveMyReview(companyId, {
        calificacion: form.calificacion,
        notas: form.notas || null,
        verificacion: form.verificacion || null,
      });
      setForm(EMPTY_REVIEW);
      await onSaved(companyId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <form className="review-form" onSubmit={handleSave}>
        <div className="card-header">
          <h2>Escribí tu reseña</h2>
        </div>

        <div className="review-form-row">
          <div className="field">
            <label htmlFor="review-company">Empresa</label>
            <select
              id="review-company"
              value={companyId ?? ""}
              onChange={(e) => {
                setError(null);
                onCompanyChange(e.target.value || null);
              }}
              required
            >
              <option value="">Elegí una empresa...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="review-verificacion">¿La empresa existe?</label>
            <select
              id="review-verificacion"
              value={form.verificacion}
              onChange={(e) => setForm((f) => ({ ...f, verificacion: e.target.value }))}
            >
              {VERIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <StarRating
          value={form.calificacion}
          onChange={(calificacion) => setForm((f) => ({ ...f, calificacion }))}
          disabled={saving}
        />

        <div className="field">
          <label htmlFor="review-notas">Comentario</label>
          <textarea
            id="review-notas"
            rows={4}
            maxLength={2000}
            placeholder={
              company
                ? `Contá tu experiencia con ${company.nombre}: ¿cómo fue el proceso? ¿Respondieron?`
                : "Contá tu experiencia: ¿cómo fue el proceso? ¿Respondieron? ¿Qué tal el ambiente?"
            }
            value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="review-form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !form.calificacion || !companyId}
            title={form.calificacion ? undefined : "Elegí de 1 a 5 estrellas"}
          >
            Publicar reseña
          </button>
        </div>
      </form>

      {showLoginModal && !user && (
        <LoginRequiredModal
          auth={auth}
          message={
            company
              ? `Para dejar tu reseña sobre ${company.nombre} necesitás una cuenta.`
              : "Para dejar una reseña necesitás una cuenta."
          }
          onClose={closeLoginModal}
        />
      )}
    </section>
  );
}

export default ReviewForm;
