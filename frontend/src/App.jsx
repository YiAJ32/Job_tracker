import ApplicationsTab from "./ApplicationsTab";

function App() {
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
      </header>
      <ApplicationsTab />
    </div>
  );
}

export default App;
