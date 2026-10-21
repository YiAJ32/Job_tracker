import { useState } from "react";
import ApplicationsTab from "./ApplicationsTab";
import MatchReviewTab from "./MatchReviewTab";
import CompanyRatingTab from "./CompanyRatingTab";
import LoginRequiredModal from "./LoginRequiredModal";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "./useAuth";
import { useTheme } from "./useTheme";

const TABS = [
  { id: "match", label: "Revisar match" },
  { id: "applications", label: "Solicitudes" },
  { id: "rating", label: "Company rating" },
];

function App() {
  const [activeTab, setActiveTab] = useState("applications");
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand">
          <div className="brand-mark">JT</div>
          <div>
            <h1>Job Tracker</h1>
            <p>Organiza tu búsqueda de empleo en un solo lugar</p>
          </div>
        </div>

        <div className="header-actions">
          {auth.user ? (
            <div className="user-chip">
              <span className="user-chip-name">{auth.user.nombre}</span>
              <button type="button" className="link-button" onClick={auth.logout}>
                Salir
              </button>
            </div>
          ) : (
            !auth.checking && (
              <button type="button" className="user-chip" onClick={() => setShowLogin(true)}>
                Iniciar sesión
              </button>
            )
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <nav className="navbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "match" && <MatchReviewTab />}
      {activeTab === "applications" && <ApplicationsTab />}
      {activeTab === "rating" && <CompanyRatingTab auth={auth} />}

      {showLogin && !auth.user && (
        <LoginRequiredModal
          auth={auth}
          title="Iniciar sesión"
          message="Con tu cuenta podés agregar empresas, calificarlas y dejar reseñas."
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}

export default App;
