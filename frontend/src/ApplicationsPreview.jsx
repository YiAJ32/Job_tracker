import { useI18n } from "./i18n";

// Vista para usuarios sin sesión: muestra que la función existe, con datos de ejemplo
const SAMPLE_ROWS = [
  { empresa: "Acme Inc.", puesto: "preview.sample.frontend", estado: "entrevista", fecha: "2026-10-14" },
  { empresa: "Globex", puesto: "preview.sample.data", estado: "en-revision", fecha: "2026-10-09" },
  { empresa: "Initech", puesto: "preview.sample.backend", estado: "aplicado", fecha: "2026-10-02" },
  { empresa: "Umbrella", puesto: "preview.sample.qa", estado: "oferta", fecha: "2026-09-25" },
];

const FEATURES = ["preview.feature1", "preview.feature2", "preview.feature3"];

function ApplicationsPreview({ onLogin }) {
  const { t } = useI18n();

  return (
    <section className="card applications-preview">
      <div className="card-header">
        <h2>{t("applications.listTitle")}</h2>
      </div>

      <div className="preview-body">
        <div className="preview-sample" aria-hidden="true">
          <table>
            <thead>
              <tr>
                <th>{t("applications.company")}</th>
                <th>{t("applications.position")}</th>
                <th>{t("applications.status")}</th>
                <th>{t("applications.date")}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map((row) => (
                <tr key={row.empresa}>
                  <td className="cell-company">{row.empresa}</td>
                  <td>{t(row.puesto)}</td>
                  <td>
                    <span className="preview-badge" data-status={row.estado}>
                      {t(`status.${row.estado}`)}
                    </span>
                  </td>
                  <td className="cell-muted">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="preview-overlay">
          <div className="preview-panel">
            <div className="login-modal-icon" aria-hidden="true">🔒</div>
            <h3>{t("preview.headline")}</h3>
            <ul className="preview-features">
              {FEATURES.map((feature) => (
                <li key={feature}>{t(feature)}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={onLogin}>
              {t("preview.cta")}
            </button>
            <span className="preview-note">{t("preview.note")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ApplicationsPreview;
