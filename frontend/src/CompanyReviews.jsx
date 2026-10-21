import { useEffect, useState } from "react";
import { deleteMyReview, listReviews, saveMyReview } from "./api";
import { VERIFICATION_OPTIONS } from "./ReviewForm";
import StarRating, { AverageStars } from "./StarRating";

const VERIFICATION_LABELS = { existe: "✓ Dice que existe", fantasma: "👻 Dice que es fantasma" };

const RELATIVE_UNITS = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormat = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function timeAgo(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.round(seconds / size), unit);
    }
  }
  return "hace un momento";
}

function fullDate(value) {
  return new Date(value).toLocaleString("es", { dateStyle: "long", timeStyle: "short" });
}

function initials(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// Color estable por autor para el avatar
function avatarHue(nombre) {
  let hash = 0;
  for (const char of nombre) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

function reviewToForm(review) {
  return {
    calificacion: review.calificacion,
    notas: review.notas ?? "",
    verificacion: review.verificacion ?? "",
  };
}

// La reseña propia se edita en el mismo lugar donde se lee
function ReviewEditor({ review, companyId, onDone, onCancel }) {
  const [form, setForm] = useState(() => reviewToForm(review));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function run(action) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  function handleSave(e) {
    e.preventDefault();
    run(() =>
      saveMyReview(companyId, {
        calificacion: form.calificacion,
        notas: form.notas || null,
        verificacion: form.verificacion || null,
      })
    );
  }

  return (
    <form className="review-edit" onSubmit={handleSave}>
      <div className="review-edit-row">
        <StarRating
          value={form.calificacion}
          onChange={(calificacion) => setForm((f) => ({ ...f, calificacion }))}
          disabled={saving}
        />
        <select
          aria-label="¿La empresa existe?"
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
      <textarea
        rows={4}
        maxLength={2000}
        aria-label="Comentario"
        value={form.notas}
        onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
        autoFocus
      />
      {error && <p className="error">{error}</p>}
      <div className="review-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !form.calificacion}>
          Guardar cambios
        </button>
        <button type="button" className="link-button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-ghost-danger"
          onClick={() => run(() => deleteMyReview(companyId))}
          disabled={saving}
        >
          Borrar mi reseña
        </button>
      </div>
    </form>
  );
}

function ReviewPost({ review, isMine, companyId, onChanged }) {
  const [editing, setEditing] = useState(false);
  const date = review.updated_at ?? review.created_at;
  const edited = review.updated_at && review.updated_at !== review.created_at;

  return (
    <article className={`review-post${isMine ? " is-mine" : ""}`}>
      <header className="review-post-header">
        <span
          className="review-avatar"
          style={{ "--avatar-hue": avatarHue(review.autor) }}
          aria-hidden="true"
        >
          {initials(review.autor)}
        </span>
        <div className="review-post-meta">
          <span className="review-author">
            {review.autor}
            {isMine && <span className="review-mine-badge">Vos</span>}
          </span>
          <time className="review-date" dateTime={date} title={fullDate(date)}>
            {timeAgo(date)}
            {edited && " · editada"}
          </time>
        </div>
        <div className="review-post-rating">
          <AverageStars value={review.calificacion} />
          {review.verificacion && (
            <span className="company-tag" data-verificacion={review.verificacion}>
              {VERIFICATION_LABELS[review.verificacion]}
            </span>
          )}
        </div>
      </header>
      {editing ? (
        <ReviewEditor
          review={review}
          companyId={companyId}
          onCancel={() => setEditing(false)}
          onDone={async () => {
            setEditing(false);
            await onChanged();
          }}
        />
      ) : (
        <>
          {review.notas ? (
            <p className="review-post-body">{review.notas}</p>
          ) : (
            <p className="review-post-body is-empty">Calificó sin dejar comentario.</p>
          )}
          {isMine && (
            <button type="button" className="link-button review-edit-button" onClick={() => setEditing(true)}>
              Editar reseña
            </button>
          )}
        </>
      )}
    </article>
  );
}

function CompanyReviews({ company, user, refreshKey, onChanged }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listReviews(company.id)
      .then((data) => {
        setReviews(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [company.id, refreshKey]);

  return (
    <div className="company-reviews">
      <h3 className="reviews-title">
        Lo que dicen de {company.nombre}
        {reviews.length > 0 && <span className="reviews-count">{reviews.length}</span>}
      </h3>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="cell-muted">Cargando reseñas...</p>
      ) : reviews.length === 0 ? (
        <p className="reviews-empty">
          Todavía nadie opinó. Podés dejar la primera reseña en el formulario del final.
        </p>
      ) : (
        <div className="review-feed">
          {reviews.map((review) => (
            <ReviewPost
              key={review.id}
              review={review}
              isMine={Boolean(user) && review.user_id === user.id}
              companyId={company.id}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CompanyReviews;
