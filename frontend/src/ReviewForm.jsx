import { useEffect, useRef, useState } from "react";
import { listReviews, saveMyReview } from "./api";
import LoginRequiredModal from "./LoginRequiredModal";
import StarRating from "./StarRating";
import { useI18n } from "./i18n";

export const VERIFICATION_OPTIONS = [
  { value: "", labelKey: "reviews.option.unknown" },
  { value: "existe", labelKey: "reviews.option.exists" },
  { value: "fantasma", labelKey: "reviews.option.ghost" },
];

const EMPTY_REVIEW = { calificacion: null, notas: "", verificacion: "" };

// Formulario solo para reseñas nuevas; las propias se editan desde la lista de reseñas
function ReviewForm({ companies, companyId, onCompanyChange, auth, onSaved }) {
  const { t } = useI18n();
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
      setError(t("reviews.pickCompanyError"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // El backend reemplaza la reseña existente; acá no se pisa una anterior sin querer
      const reviews = await listReviews(companyId);
      if (reviews.some((r) => r.user_id === user.id)) {
        setError(t("reviews.alreadyReviewed", { name: company?.nombre ?? t("reviews.thisCompany") }));
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
          <h2>{t("reviews.formTitle")}</h2>
        </div>

        <div className="review-form-row">
          <div className="field">
            <label htmlFor="review-company">{t("reviews.company")}</label>
            <select
              id="review-company"
              value={companyId ?? ""}
              onChange={(e) => {
                setError(null);
                onCompanyChange(e.target.value || null);
              }}
              required
            >
              <option value="">{t("reviews.pickCompany")}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="review-verificacion">{t("reviews.existsQuestion")}</label>
            <select
              id="review-verificacion"
              value={form.verificacion}
              onChange={(e) => setForm((f) => ({ ...f, verificacion: e.target.value }))}
            >
              {VERIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
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
          <label htmlFor="review-notas">{t("reviews.comment")}</label>
          <textarea
            id="review-notas"
            rows={4}
            maxLength={2000}
            placeholder={
              company
                ? t("reviews.placeholderNamed", { name: company.nombre })
                : t("reviews.placeholder")
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
            title={form.calificacion ? undefined : t("reviews.pickStars")}
          >
            {t("reviews.publish")}
          </button>
        </div>
      </form>

      {showLoginModal && !user && (
        <LoginRequiredModal
          auth={auth}
          message={
            company
              ? t("reviews.loginNamed", { name: company.nombre })
              : t("reviews.loginGeneric")
          }
          onClose={closeLoginModal}
        />
      )}
    </section>
  );
}

export default ReviewForm;
