import { useEffect, useState } from "react";
import CvDropzoneField from "./CvDropzoneField";
import { extractCvText } from "./extractCvText";
import { evaluateMatch } from "./api";
import { useI18n } from "./i18n";

function MatchReviewTab() {
  const { t } = useI18n();
  const [inputMode, setInputMode] = useState("file");
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedCvText, setExtractedCvText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  const [result, setResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState(null);

  // Cuando se sube un CV en PDF o Word, extrae su texto automáticamente
  // para usarlo en la evaluación del match.
  useEffect(() => {
    if (!cvFile) {
      setExtractedCvText("");
      setExtractError(null);
      return undefined;
    }

    let cancelled = false;
    setExtracting(true);
    setExtractError(null);

    extractCvText(cvFile)
      .then((text) => {
        if (cancelled) return;
        setExtractedCvText(text);
      })
      .catch((err) => {
        if (cancelled) return;
        setExtractedCvText("");
        setExtractError(err.message);
      })
      .finally(() => {
        if (!cancelled) setExtracting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cvFile]);

  // Texto de CV que se usará para evaluar el match, venga de un archivo o de texto pegado.
  const cvTextForMatch = inputMode === "file" ? extractedCvText : cvText;
  const canEvaluate = !extracting && !!cvTextForMatch && !!jobDescription.trim();

  async function handleEvaluate() {
    if (!canEvaluate) return;
    setEvaluating(true);
    setEvaluateError(null);
    try {
      const data = await evaluateMatch(cvTextForMatch, jobDescription);
      setResult(data);
    } catch (err) {
      setResult(null);
      setEvaluateError(err.message);
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>{t("match.cardTitle")}</h2>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-toggle-btn${inputMode === "file" ? " is-active" : ""}`}
          onClick={() => setInputMode("file")}
        >
          {t("match.uploadFile")}
        </button>
        <button
          type="button"
          className={`mode-toggle-btn${inputMode === "text" ? " is-active" : ""}`}
          onClick={() => setInputMode("text")}
        >
          {t("match.pasteText")}
        </button>
      </div>

      <div className="field">
        {inputMode === "file" ? (
          <div className="match-dropzone">
            <CvDropzoneField file={cvFile} onFileChange={setCvFile} />
            {extracting && (
              <p className="match-extract-status">{t("match.extracting")}</p>
            )}
            {extractError && <p className="match-extract-status is-error">{extractError}</p>}
          </div>
        ) : (
          <textarea
            className="cv-textarea"
            placeholder={t("match.cvPlaceholder")}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            rows={16}
          />
        )}
      </div>

      <div className="field match-field-spaced">
        <label htmlFor="job-description">{t("match.jobDescription")}</label>
        <textarea
          id="job-description"
          className="cv-textarea"
          placeholder={t("match.jobPlaceholder")}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={12}
        />
      </div>

      {evaluateError && <div className="error">⚠️ {evaluateError}</div>}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canEvaluate || evaluating}
          onClick={handleEvaluate}
        >
          {evaluating ? t("match.evaluating") : t("match.evaluate")}
        </button>
      </div>

      {result && <MatchResultCard result={result} />}
    </section>
  );
}

function MatchResultCard({ result }) {
  const { t } = useI18n();
  const { score, level, matched_keywords, missing_keywords, matched_count, total_keywords } =
    result;

  return (
    <div className="match-result">
      <div className="match-score-row">
        <div className="match-score-circle" data-level={level} style={{ "--score": score }}>
          <span className="match-score-value">{score}%</span>
        </div>
        <div>
          <p className="match-level-label" data-level={level}>
            {level ? t(`match.level.${level}`) : t("match.levelFallback")}
          </p>
          <p className="match-score-sub">
            {t("match.summary", { matched: matched_count, total: total_keywords })}
          </p>
        </div>
      </div>

      <div className="match-keywords-grid">
        <div>
          <h3 className="match-keywords-title">{t("match.matched")}</h3>
          <div className="match-keyword-list">
            {matched_keywords.length === 0 && (
              <p className="match-keywords-empty">{t("match.noneMatched")}</p>
            )}
            {matched_keywords.map((kw) => (
              <span key={kw.term} className="match-keyword-chip is-matched">
                {kw.term}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="match-keywords-title">{t("match.missing")}</h3>
          <div className="match-keyword-list">
            {missing_keywords.length === 0 && (
              <p className="match-keywords-empty">{t("match.allCovered")}</p>
            )}
            {missing_keywords.map((kw) => (
              <span key={kw.term} className="match-keyword-chip is-missing">
                {kw.term}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchReviewTab;
