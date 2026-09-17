import { useEffect, useState } from "react";
import {
  createApplication,
  deleteApplication,
  listApplications,
  listStatuses,
  updateApplication,
  uploadCv,
} from "./api";
import CvCell from "./CvCell";
import CvDropzoneField from "./CvDropzoneField";

const EMPTY_FORM = {
  empresa: "",
  puesto: "",
  estado_id: "",
  enlace_oferta: "",
  fecha_aplicacion: "",
  notas: "",
};

function slugifyStatus(nombre) {
  return (nombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

function StatusSelect({ value, statuses, onChange, className }) {
  const current = statuses.find((s) => String(s.id) === String(value));
  return (
    <select
      className={className}
      data-status={slugifyStatus(current?.nombre)}
      value={value}
      onChange={onChange}
    >
      {statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  );
}

function ApplicationsTab() {
  const [applications, setApplications] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [cvFile, setCvFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [apps, sts] = await Promise.all([listApplications(), listStatuses()]);
      setApplications(apps);
      setStatuses(sts);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

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
    try {
      const created = await createApplication({
        ...form,
        estado_id: Number(form.estado_id),
        fecha_aplicacion: form.fecha_aplicacion || null,
        enlace_oferta: form.enlace_oferta || null,
        notas: form.notas || null,
      });
      if (cvFile) {
        await uploadCv(created.id, cvFile);
      }
      setForm((f) => ({ ...EMPTY_FORM, estado_id: f.estado_id }));
      setCvFile(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(app, estado_id) {
    try {
      await updateApplication(app.id, { estado_id: Number(estado_id) });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteApplication(id);
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
              {s.nombre} <strong>{s.count}</strong>
            </span>
          ))}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2>Nueva solicitud</h2>
        </div>
        <form onSubmit={handleSubmit} className="app-form">
          <div className="field">
            <label htmlFor="empresa">Empresa</label>
            <input
              id="empresa"
              name="empresa"
              placeholder="Ej. Acme Inc."
              value={form.empresa}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="puesto">Puesto</label>
            <input
              id="puesto"
              name="puesto"
              placeholder="Ej. Desarrollador Frontend"
              value={form.puesto}
              onChange={handleChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="estado_id">Estado</label>
            <StatusSelect
              className=""
              value={form.estado_id}
              statuses={statuses}
              onChange={(e) => handleChange(e)}
            />
          </div>
          <div className="field">
            <label htmlFor="fecha_aplicacion">Fecha</label>
            <input
              id="fecha_aplicacion"
              name="fecha_aplicacion"
              type="date"
              value={form.fecha_aplicacion}
              onChange={handleChange}
            />
          </div>
          <div className="field span-2">
            <label htmlFor="enlace_oferta">Enlace de la oferta</label>
            <input
              id="enlace_oferta"
              name="enlace_oferta"
              placeholder="https://..."
              value={form.enlace_oferta}
              onChange={handleChange}
            />
          </div>
          <div className="field span-2">
            <label htmlFor="notas">Notas</label>
            <input
              id="notas"
              name="notas"
              placeholder="Contexto, contactos, próximos pasos..."
              value={form.notas}
              onChange={handleChange}
            />
          </div>
          <div className="field">
            <label>CV</label>
            <CvDropzoneField file={cvFile} onFileChange={setCvFile} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Agregar solicitud
            </button>
          </div>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <div className="card-header">
          <h2>Solicitudes</h2>
          {applications.length > 0 && <span className="count">{applications.length} total</span>}
        </div>

        {loading ? (
          <div className="state-block">
            <p>Cargando solicitudes...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">📋</div>
            <p>Todavía no hay solicitudes registradas.</p>
            <span className="state-sub">Agrega la primera usando el formulario de arriba.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Puesto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Enlace</th>
                  <th>Notas</th>
                  <th>CV</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td data-label="Empresa" className="cell-company">
                      {app.empresa}
                    </td>
                    <td data-label="Puesto">{app.puesto}</td>
                    <td data-label="Estado">
                      <StatusSelect
                        className="table-select"
                        value={app.estado_id}
                        statuses={statuses}
                        onChange={(e) => handleStatusChange(app, e.target.value)}
                      />
                    </td>
                    <td data-label="Fecha" className="cell-muted">
                      {app.fecha_aplicacion ?? "-"}
                    </td>
                    <td data-label="Enlace" className="cell-link">
                      {app.enlace_oferta ? (
                        <a href={app.enlace_oferta} target="_blank" rel="noreferrer">
                          Ver oferta
                        </a>
                      ) : (
                        <span className="cell-muted">-</span>
                      )}
                    </td>
                    <td data-label="Notas" className="cell-muted">
                      {app.notas ?? "-"}
                    </td>
                    <td data-label="CV">
                      <CvCell application={app} onChange={loadAll} />
                    </td>
                    <td data-label="">
                      <button
                        className="btn-ghost-danger"
                        onClick={() => handleDelete(app.id)}
                        aria-label="Eliminar solicitud"
                        title="Eliminar"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default ApplicationsTab;
