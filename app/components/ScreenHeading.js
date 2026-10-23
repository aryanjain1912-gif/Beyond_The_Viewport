import Link from "next/link";

export function ScreenHeading({ eyebrow, title, description, action }) {
  return (
    <div className="screen-heading">
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="screen-description">{description}</p>}
      </div>
      {action && <Link className="button button-quiet" href={action.href}>{action.label} <span>→</span></Link>}
    </div>
  );
}

export function StatGrid({ stats }) {
  return (
    <div className="live-stats">
      {stats.map(({ label, value, detail }) => (
        <article className="live-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail && <small>{detail}</small>}
        </article>
      ))}
    </div>
  );
}
