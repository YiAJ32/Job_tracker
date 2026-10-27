import { useCallback, useEffect, useState } from "react";
import ApplicationsTab from "./ApplicationsTab";
import ApplicationsPreview from "./ApplicationsPreview";
import Avatar from "./Avatar";
import MatchReviewTab from "./MatchReviewTab";
import CompanyRatingTab from "./CompanyRatingTab";
import LanguageSelect from "./LanguageSelect";
import LoginRequiredModal from "./LoginRequiredModal";
import ProfilePage from "./ProfilePage";
import ThemeToggle from "./ThemeToggle";
import UserBar from "./UserBar";
import { getProfile } from "./api";
import { useI18n } from "./i18n";
import { useAuth } from "./useAuth";
import { useTheme } from "./useTheme";

// El texto de cada pestaña vive en los diccionarios: tabs.<id>.label / tabs.<id>.description
const TABS = [
  { id: "applications", requiresLogin: true },
  { id: "match" },
  { id: "rating" },
];

function App() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("applications");
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [profile, setProfile] = useState(null);
  // Pedidos de la barra o del perfil: abrir el formulario o una empresa puntual
  const [formFocus, setFormFocus] = useState(0);
  const [companyFocus, setCompanyFocus] = useState(null);

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch {
      // Si falla, la barra y el perfil siguen con los datos anteriores
    }
  }, []);

  useEffect(() => {
    if (auth.user) refreshProfile();
    else setProfile(null);
  }, [auth.user?.id, refreshProfile]);

  // Al cerrar sesión el perfil deja de existir
  useEffect(() => {
    if (!auth.user && !auth.checking && activeTab === "profile") setActiveTab("applications");
  }, [auth.user, auth.checking, activeTab]);

  // Navegación normal: descarta pedidos de foco viejos para que no se repitan al volver
  function goTo(tab) {
    setFormFocus(0);
    setCompanyFocus(null);
    setActiveTab(tab);
  }

  function openTab(tab) {
    goTo(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNewApplication() {
    setActiveTab("applications");
    setFormFocus((n) => n + 1);
  }

  function openCompany(companyId) {
    setActiveTab("rating");
    setCompanyFocus({ id: companyId, nonce: Date.now() });
  }

  const userActions = {
    openTab,
    openProfile: () => openTab("profile"),
    openNewApplication,
    openCompany,
  };

  const currentTab = TABS.find((tab) => tab.id === activeTab);

  return (
    <div className={`page${auth.user ? " has-user-bar" : ""}`}>
      <header className="page-header">
        <button
          type="button"
          className="brand"
          onClick={() => openTab("applications")}
          title={t("app.goHome")}
        >
          <div className="brand-mark">JT</div>
          <div>
            <h1>Job Tracker</h1>
            <p>{t("app.tagline")}</p>
          </div>
        </button>

        <div className="header-actions">
          <LanguageSelect />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {auth.user ? (
            <div className="user-chip">
              <Avatar user={auth.user} size="sm" />
              <button
                type="button"
                className="user-chip-name link-button"
                onClick={userActions.openProfile}
                title={t("app.goProfile")}
              >
                {auth.user.nombre}
              </button>
              <button type="button" className="link-button" onClick={auth.logout}>
                {t("app.logout")}
              </button>
            </div>
          ) : (
            !auth.checking && (
              <button type="button" className="user-chip" onClick={() => setShowLogin(true)}>
                {t("app.login")}
              </button>
            )
          )}
        </div>
      </header>

      {auth.user && (
        <UserBar
          user={auth.user}
          profile={profile}
          activeTab={activeTab}
          actions={userActions}
          onOpen={refreshProfile}
          onLogout={auth.logout}
        />
      )}

      <nav className="navbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => goTo(tab.id)}
          >
            {t(`tabs.${tab.id}.label`)}
            {tab.requiresLogin && !auth.user && (
              <span className="nav-tab-lock" aria-label={t("app.requiresLogin")} title={t("app.requiresLogin")}>
                🔒
              </span>
            )}
          </button>
        ))}
      </nav>

      {currentTab && (
        <div className="page-intro">
          <h2>{t(`tabs.${currentTab.id}.label`)}</h2>
          <p>{t(`tabs.${currentTab.id}.description`)}</p>
        </div>
      )}

      {activeTab === "match" && <MatchReviewTab />}
      {activeTab === "applications" &&
        !auth.checking &&
        (auth.user ? (
          <ApplicationsTab
            key={auth.user.id}
            focusFormRequest={formFocus}
            onChange={refreshProfile}
          />
        ) : (
          <ApplicationsPreview onLogin={() => setShowLogin(true)} />
        ))}
      {activeTab === "rating" && (
        <CompanyRatingTab auth={auth} focusRequest={companyFocus} onChange={refreshProfile} />
      )}
      {activeTab === "profile" && auth.user && (
        <ProfilePage
          profile={profile}
          actions={userActions}
          onLogout={auth.logout}
          onUserUpdated={(user) => {
            auth.updateUser(user);
            refreshProfile();
          }}
        />
      )}

      {showLogin && !auth.user && (
        <LoginRequiredModal
          auth={auth}
          title={t("app.login")}
          message={t("app.loginMessage")}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}

export default App;
