import BrandEmblem from "./BrandEmblem";

export default function DashboardLoading() {
  return (
    <main className="sanctum-shell app-shell dashboard-loading">
      <aside className="sidebar" aria-hidden="true">
        <div className="brand">
          <BrandEmblem className="brand-seal" />
          <span className="brand-copy">
            <span className="brand-name">THE KAMAR-TAJ</span>
            <span className="brand-caption">REFECTORY · MYSTIC SANCTUM</span>
          </span>
        </div>
        <nav className="loading-nav">
          <span />
          <span />
          <span />
          <span />
        </nav>
      </aside>
      <section className="dashboard">
        <header className="topbar">
          <div className="breadcrumb">REFECTORY <span>/</span> <strong>YOUR SANCTUM</strong></div>
          <span className="loading-status" role="status">Loading page...</span>
        </header>
        <div className="dashboard-content" aria-hidden="true">
          <div className="loading-heading">
            <span className="loading-line loading-line-short" />
            <span className="loading-line loading-line-title" />
            <span className="loading-line loading-line-description" />
          </div>
          <div className="loading-cards">
            <div className="loading-card" />
            <div className="loading-card" />
            <div className="loading-card" />
          </div>
          <div className="loading-panel" />
        </div>
      </section>
    </main>
  );
}
