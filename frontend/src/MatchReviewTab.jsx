import { useState } from "react";
import CvDropzoneField from "./CvDropzoneField";

function MatchReviewTab() {
  const [inputMode, setInputMode] = useState("file");
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");

  return (
    <section className="card">
      <div className="card-header">
        <h2>Revisar match</h2>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-toggle-btn${inputMode === "file" ? " is-active" : ""}`}
          onClick={() => setInputMode("file")}
        >
          Subir archivo
        </button>
        <button
          type="button"
          className={`mode-toggle-btn${inputMode === "text" ? " is-active" : ""}`}
          onClick={() => setInputMode("text")}
        >
          Pegar texto
        </button>
      </div>

      <div className="field">
        {inputMode === "file" ? (
          <div className="match-dropzone">
            <CvDropzoneField file={cvFile} onFileChange={setCvFile} />
          </div>
        ) : (
          <textarea
            className="cv-textarea"
            placeholder="Pega aquí el contenido de tu CV..."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={16}
          />
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-primary">
          Evaluar
        </button>
      </div>
    </section>
  );
}

export default MatchReviewTab;
