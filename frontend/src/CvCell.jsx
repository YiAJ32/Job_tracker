import { useRef, useState } from "react";
import { deleteCv, uploadCv } from "./api";
import CvPreviewModal from "./CvPreviewModal";
import { hasAllowedCvExtension } from "./cvValidation";
import { useI18n } from "./i18n";

function CvCell({ application, onChange }) {
  const { t } = useI18n();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!hasAllowedCvExtension(file.name)) {
      setError(t("cv.onlyPdfWord"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await uploadCv(application.id, file);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await deleteCv(application.id);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  if (application.cv_original_filename) {
    return (
      <div className="cv-cell">
        <button
          type="button"
          className="cv-chip"
          onClick={() => setPreviewOpen(true)}
          title={t("cv.view")}
        >
          <span className="cv-chip-icon">📄</span>
          <span className="cv-chip-name">{application.cv_original_filename}</span>
        </button>
        <button
          type="button"
          className="cv-remove"
          onClick={handleRemove}
          disabled={busy}
          aria-label={t("cv.remove")}
          title={t("cv.remove")}
        >
          ×
        </button>
        {error && <span className="cv-error">{error}</span>}
        {previewOpen && (
          <CvPreviewModal
            source={{
              type: "remote",
              applicationId: application.id,
              filename: application.cv_original_filename,
            }}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`cv-dropzone${dragOver ? " is-dragover" : ""}${busy ? " is-busy" : ""}`}
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
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <span className="cv-dropzone-text">
        {busy ? t("cv.uploading") : t("cv.dropShort")}
      </span>
      {error && <span className="cv-error">{error}</span>}
    </div>
  );
}

export default CvCell;
