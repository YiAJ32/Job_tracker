import { useEffect, useState } from "react";
import { updateApplication } from "./api";
import ApplicationFields, { applicationToForm, formToPayload } from "./ApplicationFields";
import { useI18n } from "./i18n";

function EditApplicationModal({ application, statuses, onSaved, onClose }) {
  const { t } = useI18n();
  const [form, setForm] = useState(() => applicationToForm(application));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, saving]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateApplication(application.id, formToPayload(form));
      await onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="cv-modal-overlay" onClick={saving ? undefined : onClose}>
      <div
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-application-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-header">
          <h2 id="edit-application-title">{t("applications.editTitle")}</h2>
          <button
            type="button"
            className="cv-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="app-form">
          <ApplicationFields
            form={form}
            statuses={statuses}
            onChange={handleChange}
            idPrefix="edit-"
          />
          {error && <p className="error span-all">{error}</p>}
          <div className="form-actions edit-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t("common.saving") : t("common.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditApplicationModal;
