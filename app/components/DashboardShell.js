import Link from "next/link";
import { signOutAction } from "../actions/auth";
import BrandEmblem from "./BrandEmblem";
import { formatDate, getLocalDate } from "../../lib/date";

const navigation = {
  student: [
    ["Overview", "/student"],
    ["Menus & bookings", "/student/menu"],
    ["Dietary preferences", "/student/preferences"],
    ["Meal history", "/student/history"],
    ["Rebate ledger", "/student/rebates"],
  ],
  staff: [
    ["Meal check-in", "/staff"],
    ["Offline scan queue", "/staff/offline"],
    ["Attendance history", "/staff/history"],
  ],
  admin: [
    ["Overview", "/admin"],
    ["Menus", "/admin/menus"],
    ["Meal schedules", "/admin/schedule"],
    ["Accounts & roles", "/admin/accounts"],
    ["Reports & waste", "/admin/reports"],
    ["Rebate ledger", "/admin/rebates"],
  ],
};

const roleTitles = { student: "Student", staff: "Mess staff", admin: "Administrator" };

export default function DashboardShell({ profile, active, children }) {
  const today = getLocalDate();

  return (
    <main className="sanctum-shell app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <BrandEmblem className="brand-seal" />
          <span className="brand-copy">
            <span className="brand-name">THE KAMAR-TAJ</span>
            <span className="brand-caption">REFECTORY · MYSTIC SANCTUM</span>
          </span>
        </Link>
        <div className="nav-label">YOUR SANCTUM</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation[profile.role].map(([label, href]) => (
            <Link className={`nav-link${active === href ? " active" : ""}`} href={href} key={href} aria-current={active === href ? "page" : undefined}>
              <span className="icon-mark" aria-hidden="true">{label === active.split("/").at(-1) ? "✦" : "◇"}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sanctum-note">
            <span className="note-star" aria-hidden="true">✦</span>
            <p>“Food is the first magic we share.”</p>
            <span>— THE REFECTORY OATH</span>
          </div>
          <div className="profile">
            <div className="avatar" aria-hidden="true">{profile.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{profile.full_name}</strong>
              <span>{roleTitles[profile.role]}</span>
            </div>
            <form action={signOutAction}><button className="signout-button" title="Sign out" aria-label="Sign out">↗</button></form>
          </div>
        </div>
      </aside>

      <section className="dashboard">
        <header className="topbar">
          <div className="breadcrumb">REFECTORY <span>/</span> <strong>{roleTitles[profile.role].toUpperCase()}</strong></div>
          <div className="topbar-right">
            <span className="secure-badge"><i /> LIVE ACCOUNT</span>
            <span className="topbar-date">{formatDate(today, { weekday: "short", day: "numeric", month: "short" }).toUpperCase()}</span>
            <div className="topbar-profile">
              <span className="topbar-avatar" aria-hidden="true">{profile.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
              <span className="topbar-profile-copy"><strong>{profile.full_name}</strong><small>{roleTitles[profile.role]}</small></span>
            </div>
            <form className="mobile-signout" action={signOutAction}><button className="button button-quiet" type="submit">Sign out</button></form>
          </div>
        </header>
        <div className="dashboard-content">{children}</div>
      </section>
    </main>
  );
}
