import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { AverageStars } from "./StarRating";
import { useI18n } from "./i18n";

// Lista desplegable dentro del menú con las reseñas o empresas del usuario
function UserBarSublist({ items, emptyText, emptyAction, renderItem, onPick }) {
  if (items.length === 0) {
    return (
      <div className="user-bar-sublist-empty">
        <p>{emptyText}</p>
        <button type="button" className="link-button" onClick={emptyAction.onClick}>
          {emptyAction.label}
        </button>
      </div>
    );
  }
  return (
    <ul className="user-bar-sublist">
      {items.map((item) => (
        <li key={item.id}>
          <button type="button" onClick={() => onPick(item)}>
            {renderItem(item)}
          </button>
        </li>
      ))}
    </ul>
  );
}

// Menú lateral derecho: siempre queda visible el botón ☰ y al tocarlo se despliegan las opciones
function UserBar({ user, profile, activeTab, actions, onOpen, onLogout }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const closeRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function handleKey(e) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  function openDrawer() {
    setOpen(true);
    onOpen?.();
  }

  function close() {
    setOpen(false);
    setExpanded(null);
    toggleRef.current?.focus();
  }

  function run(action) {
    close();
    action();
  }

  function toggleSection(name) {
    setExpanded((current) => (current === name ? null : name));
  }

  const reviews = profile?.resenas ?? [];
  const companies = profile?.empresas_agregadas ?? [];
  const firstName = user.nombre.split(/\s+/)[0];

  return (
    <>
      <button
        type="button"
        ref={toggleRef}
        className="user-bar-toggle"
        aria-label={t("userBar.open")}
        aria-expanded={open}
        aria-controls="user-bar-drawer"
        onClick={openDrawer}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div className={`user-bar-backdrop${open ? " is-open" : ""}`} onClick={close} aria-hidden="true" />

      <aside
        id="user-bar-drawer"
        className={`user-bar${open ? " is-open" : ""}`}
        aria-label={t("userBar.label")}
        aria-hidden={!open}
        inert={open ? undefined : ""}
      >
        <div className="user-bar-head">
          <Avatar user={user} />
          <div className="user-bar-greeting">
            <strong>{t("userBar.hello", { name: firstName })}</strong>
            <span>{t("userBar.tools")}</span>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="cv-modal-close user-bar-close"
            aria-label={t("userBar.close")}
            onClick={close}
          >
            ✕
          </button>
        </div>

        <nav className="user-bar-nav">
          <button
            type="button"
            className={`user-bar-item${activeTab === "applications" ? " is-active" : ""}`}
            onClick={() => run(() => actions.openTab("applications"))}
          >
            <span className="user-bar-icon">📋</span>
            {t("userBar.myApplications")}
            <span className="user-bar-count">{profile?.solicitudes.total ?? "–"}</span>
          </button>

          <button type="button" className="user-bar-item is-primary" onClick={() => run(actions.openNewApplication)}>
            <span className="user-bar-icon">＋</span>
            {t("userBar.newApplication")}
          </button>

          <button
            type="button"
            className={`user-bar-item${expanded === "reviews" ? " is-expanded" : ""}`}
            aria-expanded={expanded === "reviews"}
            onClick={() => toggleSection("reviews")}
          >
            <span className="user-bar-icon">⭐</span>
            {t("userBar.myReviews")}
            <span className="user-bar-count">{profile ? reviews.length : "–"}</span>
            <span className="user-bar-caret" aria-hidden="true">▾</span>
          </button>
          {expanded === "reviews" && (
            <UserBarSublist
              items={reviews}
              emptyText={t("userBar.noReviews")}
              emptyAction={{ label: t("userBar.goRating"), onClick: () => run(() => actions.openTab("rating")) }}
              onPick={(review) => run(() => actions.openCompany(review.company_id))}
              renderItem={(review) => (
                <>
                  <span className="user-bar-sublist-name">{review.empresa}</span>
                  <AverageStars value={review.calificacion} />
                </>
              )}
            />
          )}

          <button
            type="button"
            className={`user-bar-item${expanded === "companies" ? " is-expanded" : ""}`}
            aria-expanded={expanded === "companies"}
            onClick={() => toggleSection("companies")}
          >
            <span className="user-bar-icon">🏢</span>
            {t("userBar.myCompanies")}
            <span className="user-bar-count">{profile ? companies.length : "–"}</span>
            <span className="user-bar-caret" aria-hidden="true">▾</span>
          </button>
          {expanded === "companies" && (
            <UserBarSublist
              items={companies}
              emptyText={t("userBar.noCompanies")}
              emptyAction={{ label: t("userBar.addCompany"), onClick: () => run(() => actions.openTab("rating")) }}
              onPick={(company) => run(() => actions.openCompany(company.id))}
              renderItem={(company) => (
                <>
                  <span className="user-bar-sublist-name">{company.nombre}</span>
                  <span className="cell-muted">
                    {t("rating.reviews", { count: company.total_resenas })}
                  </span>
                </>
              )}
            />
          )}

          <button
            type="button"
            className={`user-bar-item${activeTab === "profile" ? " is-active" : ""}`}
            onClick={() => run(actions.openProfile)}
          >
            <span className="user-bar-icon">👤</span>
            {t("userBar.myProfile")}
          </button>
        </nav>

        <button type="button" className="user-bar-item user-bar-logout" onClick={() => run(onLogout)}>
          <span className="user-bar-icon">↩</span>
          {t("userBar.logout")}
        </button>
      </aside>
    </>
  );
}

export default UserBar;
