import { useRef, useState } from "react";
import CvPreviewModal from "./CvPreviewModal";
import { hasAllowedCvExtension } from "./cvValidation";

function CvDropzoneField({ file, onFileChange }) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef(null);

  function pickFile(candidate) {
    if (!candidate) return;
    if (!hasAllowedCvExtension(candidate.name)) {
      setError("Solo se permiten archivos PDF o Word (.pdf, .doc, .docx)");
      return;
    }
    setError(null);
    onFileChange(candidate);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  function handleRemove(e) {
    e.stopPropagation();
    onFileChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file) {
    return (
      <div className="cv-cell">
        <button
          type="button"
          className="cv-chip"
          onClick={() => setPreviewOpen(true)}
          title="Ver CV"
        >
          <span className="cv-chip-icon">📄</span>
          <span className="cv-chip-name">{file.name}</span>
        </button>
        <button
          type="button"
          className="cv-remove"
          onClick={handleRemove}
          aria-label="Quitar CV"
          title="Quitar CV"
        >
          ×
        </button>
        {previewOpen && (
          <CvPreviewModal
            source={{ type: "local", file }}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`cv-dropzone${dragOver ? " is-dragover" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={(e) => pickFile(e.target.files?.[0])}
      />
      <span className="cv-dropzone-text">Arrastra el CV aquí o haz clic (PDF o Word)</span>
      {error && <span className="cv-error">{error}</span>}
    </div>
  );
}

export default CvDropzoneField;
