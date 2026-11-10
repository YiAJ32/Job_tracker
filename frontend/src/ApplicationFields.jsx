import { useI18n, useStatusLabel } from "./i18n";

export const EMPTY_APPLICATION_FORM = {
  empresa: "",
  puesto: "",
  estado_id: "",
  enlace_oferta: "",
  fecha_aplicacion: "",
  notas: "",
  descripcion_puesto: "",
};

export function slugifyStatus(nombre) {
  return (nombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

export function StatusSelect({ id, name, value, statuses, onChange, className }) {
  const statusLabel = useStatusLabel();
  const current = statuses.find((s) => String(s.id) === String(value));
  return (
    <select
      id={id}
      name={name}
      className={className}
      data-status={slugifyStatus(current?.nombre)}
      value={value}
      onChange={onChange}
    >
      {statuses.map((s) => (
        <option key={s.id} value={s.id}>
          {statusLabel(s.nombre)}
        </option>
      ))}
    </select>
  );
}

// Solicitud guardada → valores del formulario (los inputs no aceptan null)
export function applicationToForm(app) {
  return {
    empresa: app.empresa ?? "",
    puesto: app.puesto ?? "",
    estado_id: String(app.estado_id),
    enlace_oferta: app.enlace_oferta ?? "",
    fecha_aplicacion: app.fecha_aplicacion ?? "",
    notas: app.notas ?? "",
    descripcion_puesto: app.descripcion_puesto ?? "",
  };
}

// Valores del formulario → datos para la API (los campos vacíos se guardan como null)
export function formToPayload(form) {
  return {
    empresa: form.empresa,
    puesto: form.puesto,
    estado_id: Number(form.estado_id),
    fecha_aplicacion: form.fecha_aplicacion || null,
    enlace_oferta: form.enlace_oferta.trim() || null,
    notas: form.notas.trim() || null,
    descripcion_puesto: form.descripcion_puesto.trim() || null,
  };
}

// Campos de una solicitud, compartidos por el formulario de alta y el de edición.
// "extra" se muestra junto a las notas (el alta lo usa para el CV).
function ApplicationFields({ form, statuses, onChange, idPrefix = "", extra = null }) {
  const { t } = useI18n();
  const fieldId = (name) => `${idPrefix}${name}`;

  return (
    <>
      <div className="field">
        <label htmlFor={fieldId("empresa")}>{t("applications.company")}</label>
        <input
          id={fieldId("empresa")}
          name="empresa"
          placeholder={t("applications.companyPlaceholder")}
          value={form.empresa}
          onChange={onChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("puesto")}>{t("applications.position")}</label>
        <input
          id={fieldId("puesto")}
          name="puesto"
          placeholder={t("applications.positionPlaceholder")}
          value={form.puesto}
          onChange={onChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("estado_id")}>{t("applications.status")}</label>
        <StatusSelect
          id={fieldId("estado_id")}
          name="estado_id"
          value={form.estado_id}
          statuses={statuses}
          onChange={onChange}
        />
      </div>
      <div className="field">
        <label htmlFor={fieldId("fecha_aplicacion")}>{t("applications.date")}</label>
        <input
          id={fieldId("fecha_aplicacion")}
          name="fecha_aplicacion"
          type="date"
          value={form.fecha_aplicacion}
          onChange={onChange}
        />
      </div>
      <div className="field span-2">
        <label htmlFor={fieldId("enlace_oferta")}>{t("applications.link")}</label>
        <input
          id={fieldId("enlace_oferta")}
          name="enlace_oferta"
          placeholder="https://..."
          value={form.enlace_oferta}
          onChange={onChange}
        />
      </div>
      <div className={`field ${extra ? "span-2" : "span-3"}`}>
        <label htmlFor={fieldId("notas")}>{t("applications.notes")}</label>
        <input
          id={fieldId("notas")}
          name="notas"
          placeholder={t("applications.notesPlaceholder")}
          value={form.notas}
          onChange={onChange}
        />
      </div>
      {extra}
      <div className="field span-3">
        <label htmlFor={fieldId("descripcion_puesto")}>{t("applications.description")}</label>
        <textarea
          id={fieldId("descripcion_puesto")}
          name="descripcion_puesto"
          rows={4}
          placeholder={t("applications.descriptionPlaceholder")}
          value={form.descripcion_puesto}
          onChange={onChange}
        />
      </div>
    </>
  );
}

export default ApplicationFields;
