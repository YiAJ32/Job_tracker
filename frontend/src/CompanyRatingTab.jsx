import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createCompany, listCompanies } from "./api";
import CompanyReviews from "./CompanyReviews";
import LoginRequiredModal from "./LoginRequiredModal";
import ReviewForm from "./ReviewForm";
import { AverageStars } from "./StarRating";

const EMPTY_COMPANY = { nombre: "", sitio_web: "" };

// Resume los votos "existe / fantasma" de todas las reseñas
function verificationConsensus({ votos_existe: existe, votos_fantasma: fantasma }) {
  const total = existe + fantasma;
  if (total === 0) return { key: "sin-verificar", label: "Sin verificar" };
  const detail = `${existe} existe · ${fantasma} fantasma`;
  if (fantasma > existe) return { key: "fantasma", label: "👻 Posible fantasma", detail };
  if (existe > fantasma) return { key: "existe", label: "✓ Existe", detail };
  return { key: "dividido", label: "Opiniones divididas", detail };
}

function CompanyRatingTab({ auth }) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

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
          <h2>Agregar empresa</h2>
        </div>
        <form onSubmit={handleCreate} className="app-form">
          <div className="field">
            <label htmlFor="company-nombre">Nombre</label>
            <input
              id="company-nombre"
              placeholder="Ej. Acme Inc."
              value={newCompany.nombre}
              onChange={(e) => setNewCompany((c) => ({ ...c, nombre: e.target.value }))}
              required
            />
          </div>
          <div className="field span-2">
            <label htmlFor="company-sitio">Sitio web (opcional)</label>
            <input
              id="company-sitio"
              placeholder="https://..."
              value={newCompany.sitio_web}
              onChange={(e) => setNewCompany((c) => ({ ...c, sitio_web: e.target.value }))}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Agregar
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Company rating</h2>
          {companies.length > 0 && <span className="count">{companies.length} empresas</span>}
        </div>

        {error && <p className="error">{error}</p>}

        {companies.length > 0 && (
          <input
            className="company-search"
            type="search"
            placeholder="Buscar empresa..."
            aria-label="Buscar empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        {loading ? (
          <div className="state-block">
            <p>Cargando empresas...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="state-block">
            <div className="state-icon">⭐</div>
            <p>Todavía no hay empresas.</p>
            <span className="state-sub">
              Agregá la primera con el formulario de arriba.
            </span>
          </div>
        ) : visible.length === 0 ? (
          <div className="state-block">
            <p>Ninguna empresa coincide con "{search}".</p>
          </div>
        ) : (
          <ul className="company-list">
            {visible.map((company) => {
              const consensus = verificationConsensus(company);
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
                              Sitio web
                            </a>
                            {" · "}
                          </>
                        )}
                        {company.agregada_por
                          ? `Agregada por ${company.agregada_por}`
                          : "Agregada desde una solicitud"}
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
                        {company.total_resenas}{" "}
                        {company.total_resenas === 1 ? "reseña" : "reseñas"}{" "}
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
          title="Iniciá sesión para agregar empresas"
          message={
            newCompany.nombre.trim()
              ? `Para agregar ${newCompany.nombre.trim()} necesitás una cuenta.`
              : "Para agregar una empresa necesitás una cuenta."
          }
          onClose={closeLoginModal}
        />
      )}
    </div>
  );
}

export default CompanyRatingTab;
