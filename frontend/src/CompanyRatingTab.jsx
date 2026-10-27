import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createCompany, listCompanies } from "./api";
import CompanyReviews from "./CompanyReviews";
import LoginRequiredModal from "./LoginRequiredModal";
import ReviewForm from "./ReviewForm";
import { AverageStars } from "./StarRating";
import { useI18n } from "./i18n";

const EMPTY_COMPANY = { nombre: "", sitio_web: "" };

// Resume los votos "existe / fantasma" de todas las reseñas
function verificationConsensus({ votos_existe: existe, votos_fantasma: fantasma }, t) {
  const total = existe + fantasma;
  if (total === 0) return { key: "sin-verificar", label: t("rating.unverified") };
  const detail = t("rating.consensusDetail", { existe, fantasma });
  if (fantasma > existe) return { key: "fantasma", label: t("rating.possibleGhost"), detail };
  if (existe > fantasma) return { key: "existe", label: t("rating.exists"), detail };
  return { key: "dividido", label: t("rating.divided"), detail };
}

function CompanyRatingTab({ auth, focusRequest, onChange }) {
  const { t } = useI18n();
  const { user } = auth;
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCompany, setNewCompany] = useState(EMPTY_COMPANY);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [reviewCompanyId, setReviewCompanyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Un invitado tocó "Agregar": al iniciar sesión se crea la empresa que ya escribió
  const pendingCreate = useRef(false);
  const rowRefs = useRef(new Map());
  // Fila que hay que mantener a la vista cuando cambia la empresa abierta
  const scrollAnchor = useRef(null);

  // Al abrir una empresa se cierra la anterior; si estaba más arriba, la lista se encoge
  // y la fila elegida se iría fuera de la pantalla. Se corrige el scroll antes de pintar.
  useLayoutEffect(() => {
    const anchor = scrollAnchor.current;
    const row = anchor && rowRefs.current.get(anchor.id);
    if (!row) return;
    scrollAnchor.current = null;
    if (anchor.top == null) {
      row.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy(0, row.getBoundingClientRect().top - anchor.top);
    }
  }, [openId, companies]);

  function toggleCompany(id) {
    const next = openId === id ? null : id;
    const row = rowRefs.current.get(id);
    scrollAnchor.current = row ? { id, top: row.getBoundingClientRect().top } : null;
    setOpenId(next);
    // El formulario del final apunta a la empresa que se está leyendo
    if (next) setReviewCompanyId(next);
  }

  async function handleReviewSaved(companyId) {
    setRefreshKey((k) => k + 1);
    scrollAnchor.current = { id: companyId };
    setOpenId(companyId);
    await loadCompanies();
  }

  async function loadCompanies() {
    try {
      setCompanies(await listCompanies());
      setError(null);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  // Abrir una empresa pedida desde el perfil o la barra de usuario
  useEffect(() => {
    if (!focusRequest) return;
    setSearch("");
    scrollAnchor.current = { id: focusRequest.id };
    setOpenId(focusRequest.id);
    setReviewCompanyId(focusRequest.id);
  }, [focusRequest]);

  useEffect(() => {
    if (!user || !pendingCreate.current) return;
    pendingCreate.current = false;
    create();
  }, [user?.id]);

  // Sin sesión se puede completar el formulario; el login se pide recién al agregar
  function handleCreate(e) {
    e.preventDefault();
    if (!user) {
      pendingCreate.current = true;
      setShowLoginModal(true);
      return;
    }
    create();
  }

  function closeLoginModal() {
    pendingCreate.current = false;
    setShowLoginModal(false);
  }

  async function create() {
    setError(null);
    try {
      const created = await createCompany({
        nombre: newCompany.nombre,
        sitio_web: newCompany.sitio_web || null,
      });
      setNewCompany(EMPTY_COMPANY);
      setSearch("");
      await loadCompanies();
      scrollAnchor.current = { id: created.id };
      setOpenId(created.id);
      setReviewCompanyId(created.id);
    } catch (err) {
      setError(err.message);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? companies.filter((c) => c.nombre.toLowerCase().includes(term))
    : companies;

  return (
    <div>
      <section className="card">
        <div className="card-header">
          <h2>{t("rating.addTitle")}</h2>
        </div>
        <form onSubmit={handleCreate} className="app-form">
          <div className="field">
            <label htmlFor="company-nombre">{t("rating.name")}</label>
            <input
              id="company-nombre"
              placeholder={t("rating.namePlaceholder")}
              value={newCompany.nombre}
              onChange={(e) => setNewCompany((c) => ({ ...c, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="field span-2">
            <label htmlFor="company-sitio">{t("rating.website")}</label>
            <input
              id="company-sitio"
              placeholder="https://..."
              value={newCompany.sitio_web}
              onChange={(e) => setNewCompany((c) => ({ ...c, sitio_web: e.target.value }))}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {t("rating.add")}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>{t("rating.listTitle")}</h2>
          {companies.length > 0 && (
            <span className="count">{t("rating.count", { count: companies.length })}</span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {companies.length > 0 && (
          <input
            className="company-search"
            type="search"
            placeholder={t("rating.search")}
            aria-label={t("rating.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {loading ? (
          <div className="state-block">
            <p>{t("rating.loading")}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">⭐</div>
            <p>{t("rating.empty")}</p>
            <span className="state-sub">{t("rating.emptySub")}</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="state-block">
            <p>{t("rating.noMatch", { search })}</p>
          </div>
        ) : (
          <ul className="company-list">
            {visible.map((company) => {
              const consensus = verificationConsensus(company, t);
              const isOpen = openId === company.id;
              return (
                <li
                  key={company.id}
                  className="company-row"
                  ref={(el) => {
                    if (el) rowRefs.current.set(company.id, el);
                    else rowRefs.current.delete(company.id);
                  }}
                >
                  <div className="company-summary">
                    <div className="company-info">
                      <div className="company-name-row">
                        <span className="cell-company">{company.nombre}</span>
                        <span
                          className="company-tag"
                          data-verificacion={consensus.key}
                          title={consensus.detail}
                        >
                          {consensus.label}
                        </span>
                      </div>
                      <span className="cell-muted">
                        {company.sitio_web && (
                          <>
                            <a href={company.sitio_web} target="_blank" rel="noreferrer">
                              {t("rating.websiteLink")}
                            </a>
                            {" · "}
                          </>
                        )}
                        {company.agregada_por
                          ? t("rating.addedBy", { name: company.agregada_por })
                          : t("rating.addedFromApplication")}
                      </span>
                    </div>

                    <div className="company-score">
                      <div className="company-score-stars">
                        <AverageStars value={company.promedio} />
                        <strong>{company.promedio ?? "–"}</strong>
                      </div>
                      <button
                        type="button"
                        className="link-button"
                        aria-expanded={isOpen}
                        onClick={() => toggleCompany(company.id)}
                      >
                        {t("rating.reviews", { count: company.total_resenas })}{" "}
                        {isOpen ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <CompanyReviews
                      company={company}
                      user={user}
                      refreshKey={refreshKey}
                      onChanged={() => handleReviewSaved(company.id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {companies.length > 0 && (
        <ReviewForm
          companies={companies}
          companyId={reviewCompanyId}
          onCompanyChange={setReviewCompanyId}
          auth={auth}
          onSaved={handleReviewSaved}
        />
      )}

      {showLoginModal && !user && (
        <LoginRequiredModal
          auth={auth}
          title={t("rating.loginTitle")}
          message={
            newCompany.nombre.trim()
              ? t("rating.loginNamed", { name: newCompany.nombre.trim() })
              : t("rating.loginGeneric")
          }
          onClose={closeLoginModal}
        />
      )}
    </div>
  );
}

export default CompanyRatingTab;
