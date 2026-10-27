import { useEffect, useRef, useState } from "react";
import { deletePhoto, updateProfile, uploadPhoto } from "./api";
import { slugifyStatus } from "./ApplicationsTab";
import Avatar from "./Avatar";
import { AverageStars } from "./StarRating";
import { useI18n, useStatusLabel } from "./i18n";

const VERIFICATION_LABELS = { existe: "profile.youSaidExists", fantasma: "profile.youSaidGhost" };

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function ProfileEditor({ user, onSaved, onCancel }) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(user.nombre);
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!photoFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setError(t("profile.photoTypeError"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("profile.photoSizeError"));
      return;
    }
    setError(null);
    setPhotoFile(file);
    setRemovePhoto(false);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setRemovePhoto(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let updated = user;
      if (nombre.trim() !== user.nombre) updated = await updateProfile({ nombre: nombre.trim() });
      if (photoFile) updated = await uploadPhoto(photoFile);
      else if (removePhoto && user.foto_url) updated = await deletePhoto();
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const hasPhoto = Boolean(preview || (user.foto_url && !removePhoto));
  const shownUser = { ...user, nombre, foto_url: removePhoto ? null : user.foto_url };

  return (
    <form className="profile-editor" onSubmit={handleSubmit}>
      <div className="profile-editor-photo">
        <Avatar user={shownUser} src={preview ?? undefined} size="xl" />
        <div className="profile-editor-photo-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInput.current?.click()}>
            {hasPhoto ? t("profile.changePhoto") : t("profile.uploadPhoto")}
          </button>
          {hasPhoto && (
            <button type="button" className="link-button profile-editor-remove" onClick={handleRemovePhoto}>
              {t("profile.removePhoto")}
            </button>
          )}
          <span className="profile-editor-hint">{t("profile.photoHint")}</span>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          onChange={handlePhoto}
          hidden
        />
      </div>

      <div className="field">
        <label htmlFor="profile-nombre">{t("profile.name")}</label>
        <input
          id="profile-nombre"
          value={nombre}
          maxLength={80}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="profile-email">{t("profile.email")}</label>
        <input id="profile-email" value={user.email} disabled />
      </div>

      {error && <p className="error">{error}</p>}

      <div className="profile-editor-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !nombre.trim()}>
          {saving ? t("common.saving") : t("common.saveChanges")}
        </button>
      </div>
    </form>
  );
}

function ProfilePage({ profile, actions, onLogout, onUserUpdated }) {
  const { t, formatDate } = useI18n();
  const statusLabel = useStatusLabel();
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <section className="card">
        <div className="state-block">
          <p>{t("profile.loading")}</p>
        </div>
      </section>
    );
  }

  const { user, solicitudes, resenas, empresas_agregadas: empresas } = profile;

  return (
    <div className="profile">
      {editing ? (
        <section className="card">
          <div className="card-header">
            <h2>{t("profile.editTitle")}</h2>
          </div>
          <ProfileEditor
            user={user}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false);
              onUserUpdated(updated);
            }}
          />
        </section>
      ) : (
      <section className="card profile-header">
        <Avatar user={user} size="lg" />
        <div className="profile-identity">
          <h2>{user.nombre}</h2>
          <span className="cell-muted">{user.email}</span>
          {user.created_at && (
            <span className="profile-since">
              {t("profile.memberSince", {
                date: formatDate(user.created_at, { month: "long", year: "numeric" }),
              })}
            </span>
          )}
        </div>
        <div className="profile-header-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
            {t("profile.edit")}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onLogout}>
            {t("profile.logout")}
          </button>
        </div>
      </section>
      )}

      <div className="profile-stats">
        <button type="button" className="profile-stat" onClick={() => actions.openTab("applications")}>
          <strong>{solicitudes.total}</strong>
          <span>{t("profile.stat.applications", { count: solicitudes.total })}</span>
        </button>
        <a className="profile-stat" href="#mis-resenas">
          <strong>{resenas.length}</strong>
          <span>{t("profile.stat.reviews", { count: resenas.length })}</span>
        </a>
        <a className="profile-stat" href="#mis-empresas">
          <strong>{empresas.length}</strong>
          <span>{t("profile.stat.companies", { count: empresas.length })}</span>
        </a>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>{t("profile.applicationsTitle")}</h2>
          <div className="profile-card-actions">
            <button type="button" className="link-button" onClick={() => actions.openTab("applications")}>
              {t("profile.viewAll")}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={actions.openNewApplication}>
              {t("profile.newApplication")}
            </button>
          </div>
        </div>

        {solicitudes.total === 0 ? (
          <div className="state-block">
            <div className="state-icon">📋</div>
            <p>{t("profile.noApplications")}</p>
            <span className="state-sub">{t("profile.noApplicationsSub")}</span>
          </div>
        ) : (
          <>
            <div className="stats">
              {solicitudes.por_estado.map((s) => (
                <span key={s.id} className="stat-pill">
                  <span className="dot" data-status={slugifyStatus(s.nombre)} style={{ backgroundColor: "currentColor" }} />
                  {statusLabel(s.nombre)} <strong>{s.count}</strong>
                </span>
              ))}
            </div>
            <h3 className="profile-subtitle">{t("profile.recent")}</h3>
            <ul className="profile-list">
              {solicitudes.recientes.map((app) => (
                <li key={app.id}>
                  <div className="profile-list-main">
                    <span className="cell-company">{app.empresa}</span>
                    <span className="cell-muted">{app.puesto}</span>
                  </div>
                  <span className="preview-badge" data-status={slugifyStatus(app.estado)}>
                    {statusLabel(app.estado)}
                  </span>
                  <span className="cell-muted profile-list-date">
                    {formatDate(app.fecha_aplicacion ?? app.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card" id="mis-resenas">
        <div className="card-header">
          <h2>{t("profile.reviewsTitle")}</h2>
          {resenas.length > 0 && <span className="count">{t("common.total", { count: resenas.length })}</span>}
        </div>

        {resenas.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">⭐</div>
            <p>{t("profile.noReviews")}</p>
            <button type="button" className="link-button" onClick={() => actions.openTab("rating")}>
              {t("profile.rateCompany")}
            </button>
          </div>
        ) : (
          <ul className="profile-list">
            {resenas.map((review) => (
              <li key={review.id}>
                <div className="profile-list-main">
                  <span className="cell-company">{review.empresa}</span>
                  {review.notas && <span className="cell-muted profile-review-notes">{review.notas}</span>}
                  {review.verificacion && (
                    <span className="company-tag" data-verificacion={review.verificacion}>
                      {t(VERIFICATION_LABELS[review.verificacion])}
                    </span>
                  )}
                </div>
                <AverageStars value={review.calificacion} />
                <div className="profile-list-side">
                  <span className="cell-muted profile-list-date">{formatDate(review.updated_at)}</span>
                  <button type="button" className="link-button" onClick={() => actions.openCompany(review.company_id)}>
                    {t("profile.editReview")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" id="mis-empresas">
        <div className="card-header">
          <h2>{t("profile.companiesTitle")}</h2>
          {empresas.length > 0 && <span className="count">{t("common.total", { count: empresas.length })}</span>}
        </div>

        {empresas.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">🏢</div>
            <p>{t("profile.noCompanies")}</p>
            <button type="button" className="link-button" onClick={() => actions.openTab("rating")}>
              {t("profile.addCompany")}
            </button>
          </div>
        ) : (
          <ul className="profile-list">
            {empresas.map((company) => (
              <li key={company.id}>
                <div className="profile-list-main">
                  <span className="cell-company">{company.nombre}</span>
                  <span className="cell-muted">
                    {t("rating.reviews", { count: company.total_resenas })}
                  </span>
                </div>
                <div className="company-score-stars">
                  <AverageStars value={company.promedio} />
                  <strong>{company.promedio ?? "–"}</strong>
                </div>
                <div className="profile-list-side">
                  <button type="button" className="link-button" onClick={() => actions.openCompany(company.id)}>
                    {t("profile.viewReviews")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
