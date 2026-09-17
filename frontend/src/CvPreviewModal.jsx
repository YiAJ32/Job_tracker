import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { fetchCvBlob } from "./api";

const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_TYPE = "application/msword";

// source is either { type: "remote", applicationId, filename }
// or { type: "local", file } for a not-yet-uploaded File object.
function CvPreviewModal({ source, onClose }) {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [docxHtml, setDocxHtml] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const filename =
    source.type === "local" ? source.file.name : source.filename;

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    async function load() {
      try {
        let blob, contentType;
        if (source.type === "local") {
          blob = source.file;
          contentType = source.file.type;
        } else {
          const result = await fetchCvBlob(source.applicationId);
          blob = result.blob;
          contentType = result.contentType;
        }
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setDownloadUrl(objectUrl);

        if (contentType === "application/pdf") {
          setPdfUrl(objectUrl);
          setStatus("pdf");
        } else if (contentType === DOCX_TYPE) {
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          setDocxHtml(result.value);
          setStatus("docx");
        } else if (contentType === DOC_TYPE) {
          setStatus("unsupported");
        } else {
          setStatus("unsupported");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      }
    }

    load();

    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKey);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  return (
    <div className="cv-modal-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-modal-header">
          <span className="cv-modal-title">{filename}</span>
          <div className="cv-modal-actions">
            {downloadUrl && (
              <a className="cv-modal-download" href={downloadUrl} download={filename}>
                Descargar
              </a>
            )}
            <button type="button" className="cv-modal-close" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </div>
        <div className="cv-modal-body">
          {status === "loading" && <p className="cv-modal-message">Cargando vista previa...</p>}
          {status === "error" && <p className="cv-modal-message">Error: {error}</p>}
          {status === "pdf" && (
            <embed src={pdfUrl} type="application/pdf" className="cv-modal-pdf" />
          )}
          {status === "docx" && (
            <div className="cv-modal-docx" dangerouslySetInnerHTML={{ __html: docxHtml }} />
          )}
          {status === "unsupported" && (
            <p className="cv-modal-message">
              Vista previa no disponible para este tipo de archivo. Usa "Descargar" para
              abrirlo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CvPreviewModal;
