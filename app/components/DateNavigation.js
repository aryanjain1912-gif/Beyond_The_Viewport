import Link from "next/link";
import { formatDate } from "../../lib/date";

function offsetDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default function DateNavigation({ date, today, basePath = "/student/menu" }) {
  const previous = offsetDate(date, -1);
  const next = offsetDate(date, 1);
  const isPast = date <= today;

  return (
    <nav className="date-navigation" aria-label="Choose menu date">
      <Link className="date-arrow" href={`${basePath}?date=${previous}`} aria-label="Previous day" aria-disabled={date <= today}>←</Link>
      <span>{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</span>
      <Link className="date-arrow" href={`${basePath}?date=${next}`} aria-label="Next day">→</Link>
      {!isPast && <span className="date-hint">Booking is open up to 30 days ahead.</span>}
    </nav>
  );
}
