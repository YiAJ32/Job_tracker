import { useState } from "react";
import { useI18n } from "./i18n";

const STARS = [1, 2, 3, 4, 5];

function StarRating({ value, onChange, disabled = false }) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const shown = hovered ?? value ?? 0;

  function select(star) {
    if (disabled) return;
    // Volver a hacer click en la calificación actual la borra
    onChange(star === value ? null : star);
  }

  function handleKeyDown(e) {
    if (disabled) return;
    const current = value ?? 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, current + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(current <= 1 ? null : current - 1);
    } else if (/^[1-5]$/.test(e.key)) {
      onChange(Number(e.key));
    } else if (e.key === "0" || e.key === "Delete" || e.key === "Backspace") {
      onChange(null);
    }
  }

  return (
    <div className="star-rating-wrap">
      <div
        className={`star-rating${disabled ? " is-disabled" : ""}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("stars.aria")}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value ?? 0}
        aria-valuetext={value ? t("stars.valueText", { value }) : t("stars.none")}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHovered(null)}
      >
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            tabIndex={-1}
            className={`star${star <= shown ? " is-filled" : ""}${hovered ? " is-preview" : ""}`}
            onMouseEnter={() => !disabled && setHovered(star)}
            onClick={() => select(star)}
            disabled={disabled}
            title={`${star} - ${t(`stars.${star}`)}`}
            aria-hidden="true"
          >
            ★
          </button>
        ))}
      </div>
      <span className="star-rating-label">{shown ? t(`stars.${shown}`) : t("stars.none")}</span>
    </div>
  );
}

// Estrellas de solo lectura que se llenan en forma proporcional (ej. 3.6 de 5)
export function AverageStars({ value }) {
  const { t } = useI18n();
  const percent = value ? (value / 5) * 100 : 0;
  return (
    <span
      className="average-stars"
      role="img"
      aria-label={value ? t("stars.valueText", { value }) : t("stars.noRatings")}
    >
      <span className="average-stars-empty">★★★★★</span>
      <span className="average-stars-filled" style={{ width: `${percent}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

export default StarRating;
