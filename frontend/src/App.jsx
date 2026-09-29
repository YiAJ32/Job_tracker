import { useState } from "react";
import ApplicationsTab from "./ApplicationsTab";
import MatchReviewTab from "./MatchReviewTab";
import CompanyRatingTab from "./CompanyRatingTab";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./useTheme";

const TABS = [
  { id: "match", label: "Revisar match" },
  { id: "applications", label: "Solicitudes" },
  { id: "rating", label: "Company rating" },
];

function App() {
  const [activeTab, setActiveTab] = useState("applications");
  const { theme, toggleTheme } = useTheme();

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

        <ThemeToggle theme={theme} onToggle={toggleTheme} />
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
      {activeTab === "rating" && <CompanyRatingTab />}
    </div>
  );
}

export default App;
