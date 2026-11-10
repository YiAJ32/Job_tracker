import { useEffect, useState } from "react";
import {
  createApplication,
  deleteApplication,
  listApplications,
  listStatuses,
  safeUrl,
  updateApplication,
  uploadCv,
} from "./api";
import ApplicationFields, {
  EMPTY_APPLICATION_FORM,
  StatusSelect,
  formToPayload,
  slugifyStatus,
} from "./ApplicationFields";
import CvCell from "./CvCell";
import CvDropzoneField from "./CvDropzoneField";
import EditApplicationModal from "./EditApplicationModal";
import { useI18n, useStatusLabel } from "./i18n";

// Se reexporta porque el perfil lo importa desde acá
export { slugifyStatus };

function ApplicationsTab({ focusFormRequest = 0, onChange }) {
  const { t, formatDate } = useI18n();
  const statusLabel = useStatusLabel();
  const [applications, setApplications] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(EMPTY_APPLICATION_FORM);
  const [cvFile, setCvFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Solicitud abierta en el formulario de edición
  const [editing, setEditing] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [apps, sts] = await Promise.all([listApplications(), listStatuses()]);
      setApplications(apps);
      setStatuses(sts);
      setError(null);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // "Nueva solicitud" desde la barra de usuario lleva directo al formulario
  useEffect(() => {
    if (!focusFormRequest) return;
    const input = document.getElementById("empresa");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  }, [focusFormRequest]);

  useEffect(() => {
    if (statuses.length > 0 && !form.estado_id) {
      setForm((f) => ({ ...f, estado_id: String(statuses[0].id) }));
    }
  }, [statuses]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    let created;
    try {
      created = await createApplication(formToPayload(form));
    } catch (err) {
      setError(err.message);
      return;
    }

    // La solicitud ya existe: el formulario se limpia aunque falle el CV, para no crearla dos veces
    let cvError = null;
    if (cvFile) {
      try {
        await uploadCv(created.id, cvFile);
      } catch (err) {
        cvError = err.message;
      }
    }
    setForm((f) => ({ ...EMPTY_APPLICATION_FORM, estado_id: f.estado_id }));
    setCvFile(null);
    await loadAll();
    if (cvError) setError(t("applications.cvUploadFailed", { error: cvError }));
  }

  async function handleStatusChange(app, estado_id) {
    try {
      await updateApplication(app.id, { estado_id: Number(estado_id) });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(app) {
    if (!window.confirm(t("applications.deleteConfirm", { puesto: app.puesto, empresa: app.empresa }))) {
      return;
    }
    try {
      await deleteApplication(app.id);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const statusCounts = statuses.map((s) => ({
    ...s,
    count: applications.filter((a) => a.estado_id === s.id).length,
  }));

  return (
    <div>
      {applications.length > 0 && (
        <div className="stats">
          {statusCounts.map((s) => (
            <span key={s.id} className="stat-pill">
              <span className="dot" data-status={slugifyStatus(s.nombre)} style={{ backgroundColor: "currentColor" }} />
              {statusLabel(s.nombre)} <strong>{s.count}</strong>
            </span>
          ))}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2>{t("applications.newTitle")}</h2>
        </div>
        <form onSubmit={handleSubmit} className="app-form">
          <ApplicationFields
            form={form}
            statuses={statuses}
            onChange={handleChange}
            extra={
              <div className="field">
                <label>{t("applications.cv")}</label>
                <CvDropzoneField file={cvFile} onFileChange={setCvFile} />
              </div>
            }
          />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {t("applications.add")}
            </button>
          </div>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="card-header">
          <h2>{t("applications.listTitle")}</h2>
          {applications.length > 0 && (
            <span className="count">{t("common.total", { count: applications.length })}</span>
          )}
        </div>

        {loading ? (
          <div className="state-block">
            <p>{t("applications.loading")}</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">📋</div>
            <p>{t("applications.empty")}</p>
            <span className="state-sub">{t("applications.emptySub")}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("applications.company")}</th>
                  <th>{t("applications.position")}</th>
                  <th>{t("applications.status")}</th>
                  <th>{t("applications.date")}</th>
                  <th>{t("applications.linkColumn")}</th>
                  <th>{t("applications.notes")}</th>
                  <th>{t("applications.cv")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td data-label={t("applications.company")} className="cell-company">
                      {app.empresa}
                    </td>
                    <td data-label={t("applications.position")}>{app.puesto}</td>
                    <td data-label={t("applications.status")}>
                      <StatusSelect
                        className="table-select"
                        value={app.estado_id}
                        statuses={statuses}
                        onChange={(e) => handleStatusChange(app, e.target.value)}
                      />
                    </td>
                    <td data-label={t("applications.date")} className="cell-muted">
                      {formatDate(app.fecha_aplicacion)}
                    </td>
                    <td data-label={t("applications.linkColumn")} className="cell-link">
                      {safeUrl(app.enlace_oferta) ? (
                        <a href={safeUrl(app.enlace_oferta)} target="_blank" rel="noreferrer">
                          {t("applications.viewOffer")}
                        </a>
                      ) : (
                        <span className="cell-muted">-</span>
                      )}
                    </td>
                    <td data-label={t("applications.notes")} className="cell-muted">
                      {app.notas ?? "-"}
                    </td>
                    <td data-label={t("applications.cv")}>
                      <CvCell application={app} onChange={loadAll} />
                    </td>
                    <td data-label="" className="cell-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setEditing(app)}
                        aria-label={t("applications.editLabel", { puesto: app.puesto, empresa: app.empresa })}
                        title={t("applications.edit")}
                      >
                        {t("applications.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost-danger"
                        onClick={() => handleDelete(app)}
                        aria-label={t("applications.deleteLabel")}
                        title={t("applications.delete")}
                      >
                        {t("applications.delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditApplicationModal
          application={editing}
          statuses={statuses}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

export default ApplicationsTab;
