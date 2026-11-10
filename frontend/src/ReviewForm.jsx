import { useEffect, useRef, useState } from "react";
import { createCompany, listReviews, saveMyReview } from "./api";
import LoginRequiredModal from "./LoginRequiredModal";
import StarRating from "./StarRating";
import { useI18n } from "./i18n";

export const VERIFICATION_OPTIONS = [
  { value: "", labelKey: "reviews.option.unknown" },
  { value: "existe", labelKey: "reviews.option.exists" },
  { value: "fantasma", labelKey: "reviews.option.ghost" },
];

const EMPTY_REVIEW = { calificacion: null, notas: "", verificacion: "" };
const MAX_SUGGESTIONS = 6;

// Formulario solo para reseñas nuevas; las propias se editan desde la lista de reseñas.
// La empresa se resuelve por el nombre escrito: si no existe, se crea al publicar.
function ReviewForm({ companies, companyId, onCompanyChange, auth, onSaved }) {
  const { t } = useI18n();
  const { user } = auth;
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState(EMPTY_REVIEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const websiteRef = useRef(null);

  // Un invitado tocó publicar: al iniciar sesión se publica lo que ya escribió
  const pendingPublish = useRef(false);

  const name = companyName.trim();
  const term = name.toLowerCase();
  const company = term ? companies.find((c) => c.nombre.toLowerCase() === term) : undefined;
  const isNew = Boolean(name) && !company;
  const displayName = company?.nombre ?? name;
  const suggestions = companies
    .filter((c) => c.nombre.toLowerCase().includes(term))
    .slice(0, MAX_SUGGESTIONS);
  const selected = companies.find((c) => c.id === companyId);

  // La empresa abierta en la lista o pedida desde el perfil se carga en el formulario
  useEffect(() => {
    if (selected && selected.id !== company?.id) {
      setCompanyName(selected.nombre);
      setError(null);
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!user || !pendingPublish.current) return;
    pendingPublish.current = false;
    publish();
  }, [user?.id]);

  function changeCompanyName(value) {
    const match = companies.find((c) => c.nombre.toLowerCase() === value.trim().toLowerCase());
    setCompanyName(value);
    setError(null);
    onCompanyChange(match?.id ?? null);
  }

  function pickCompany(picked) {
    changeCompanyName(picked.nombre);
    setShowSuggestions(false);
  }

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
    setSaving(true);
    setError(null);
    let targetId = company?.id;
    let created = false;
    try {
      if (targetId) {
        // El backend reemplaza la reseña existente; acá no se pisa una anterior sin querer
        const reviews = await listReviews(targetId);
        if (reviews.some((r) => r.user_id === user.id)) {
          setError(t("reviews.alreadyReviewed", { name: company.nombre }));
          await onSaved(targetId);
          return;
        }
      } else {
        const newCompany = await createCompany({ nombre: name, sitio_web: website.trim() || null });
        targetId = newCompany.id;
        created = true;
      }
      if (form.calificacion) {
        await saveMyReview(targetId, {
          calificacion: form.calificacion,
          notas: form.notas || null,
          verificacion: form.verificacion || null,
        });
      }
      setForm(EMPTY_REVIEW);
      setCompanyName("");
      setWebsite("");
      onCompanyChange(null);
      await onSaved(targetId);
    } catch (err) {
      setError(err.message);
      // La empresa ya quedó creada: al reintentar solo falta guardar la reseña
      if (created) await onSaved(targetId);
    } finally {
      setSaving(false);
    }
  }

  const submitLabel = !isNew
    ? t("reviews.publish")
    : form.calificacion
      ? t("reviews.addAndPublish")
      : t("rating.addTitle");

  return (
    <section className="card">
      <form className="review-form" onSubmit={handleSave}>
        <div className="card-header">
          <h2>{t("reviews.formTitle")}</h2>
        </div>

        <div className="review-form-row">
          <div
            className="field company-picker"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setShowSuggestions(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false);
            }}
          >
            <label htmlFor="review-company">{t("reviews.company")}</label>
            <input
              id="review-company"
              placeholder={t("reviews.pickCompany")}
              autoComplete="off"
              maxLength={120}
              value={companyName}
              onChange={(e) => {
                changeCompanyName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              required
            />
            {showSuggestions && (suggestions.length > 0 || isNew) && (
              <ul className="company-suggestions" onMouseDown={(e) => e.preventDefault()}>
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pickCompany(c)}>
                      <span>{c.nombre}</span>
                      <span className="cell-muted">
                        {t("rating.reviews", { count: c.total_resenas })}
                      </span>
                    </button>
                  </li>
                ))}
                {isNew && (
                  <li>
                    <button
                      type="button"
                      className="company-suggestion-add"
                      onClick={() => {
                        setShowSuggestions(false);
                        websiteRef.current?.focus();
                      }}
                    >
                      + {t("reviews.addCompanyOption", { name })}
                    </button>
                  </li>
                )}
              </ul>
            )}
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

        {isNew && (
          <div className="field">
            <label htmlFor="review-sitio">{t("rating.website")}</label>
            <input
              id="review-sitio"
              ref={websiteRef}
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <span className="field-hint">{t("reviews.newCompanyHint")}</span>
          </div>
        )}

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
              name ? t("reviews.placeholderNamed", { name: displayName }) : t("reviews.placeholder")
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
            disabled={saving || !name || (!isNew && !form.calificacion)}
            title={form.calificacion ? undefined : t("reviews.pickStars")}
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {showLoginModal && !user && (
        <LoginRequiredModal
          auth={auth}
          title={isNew && !form.calificacion ? t("rating.loginTitle") : undefined}
          message={
            isNew && !form.calificacion
              ? t("rating.loginNamed", { name })
              : t("reviews.loginNamed", { name: displayName })
          }
          onClose={closeLoginModal}
        />
      )}
    </section>
  );
}

export default ReviewForm;
