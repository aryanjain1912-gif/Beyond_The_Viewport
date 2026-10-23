import DashboardShell from "../../components/DashboardShell";
import { ScreenHeading, StatGrid } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { formatDate, getLocalDate } from "../../../lib/date";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Reports & waste · Mystic Sanctum" };
export const dynamic = "force-dynamic";

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function AdminReports() {
  const profile = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const today = getLocalDate();
  const start = shiftDate(today, -6);
  const [bookings, attendance, slots] = await Promise.all([
    supabase.from("meal_bookings").select("meal_date, meal_slot_id, student_id").eq("status", "booked").gte("meal_date", start).lte("meal_date", today),
    supabase.from("meal_attendance").select("meal_date, meal_slot_id").gte("meal_date", start).lte("meal_date", today),
    supabase.from("meal_slots").select("id, title").order("sort_order"),
  ]);
  for (const result of [bookings, attendance, slots]) {
    if (result.error) throw new Error(`Could not load refectory reports: ${result.error.message}`);
  }

  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
  const reports = dates.map((date) => {
    const reservations = bookings.data.filter((item) => item.meal_date === date).length;
    const checkedIn = attendance.data.filter((item) => item.meal_date === date).length;
    return { date, reservations, checkedIn, unclaimed: Math.max(0, reservations - checkedIn) };
  });
  const maxValue = Math.max(1, ...reports.map((item) => item.reservations));
  const totalBookings = reports.reduce((sum, item) => sum + item.reservations, 0);
  const totalCheckins = reports.reduce((sum, item) => sum + item.checkedIn, 0);
  const unused = Math.max(0, totalBookings - totalCheckins);

  return (
    <DashboardShell profile={profile} active="/admin/reports">
      <ScreenHeading eyebrow="OPERATIONS & PLANNING" title="Reports & meal utilization" description="Compare reservations to verified check-ins to help the kitchen plan quantities." />
      <StatGrid stats={[
        { label: "RESERVATIONS · 7 DAYS", value: totalBookings, detail: "confirmed meals" },
        { label: "CHECK-INS · 7 DAYS", value: totalCheckins, detail: "verified attendance" },
        { label: "UNCLAIMED RESERVATIONS", value: unused, detail: "not a measured food-waste total" },
      ]} />
      <section className="surface-card report-card">
        <div className="section-title-row"><div><p className="section-kicker">LAST SEVEN DAYS</p><h2>Reservations vs. check-ins</h2></div></div>
        <div className="report-bars">
          {reports.map((item) => (
            <div className="report-day" key={item.date}>
              <div className="report-bar-pair" title={`${item.reservations} reservations, ${item.checkedIn} check-ins`}>
                <span className="bar-booked" style={{ height: `${Math.max(3, item.reservations / maxValue * 100)}%` }} />
                <span className="bar-attended" style={{ height: `${Math.max(3, item.checkedIn / maxValue * 100)}%` }} />
              </div>
              <span>{formatDate(item.date, { weekday: "short", day: "numeric" })}</span>
              <small>{item.reservations} / {item.checkedIn}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend"><span><i className="bar-booked" /> Reservations</span><span><i className="bar-attended" /> Check-ins</span></div>
      </section>
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">KITCHEN PLANNING</p><h2>Meal-slot totals · 7 days</h2></div></div>
        <div className="compact-list">{slots.data.map((slot) => {
          const slotBookings = bookings.data.filter((item) => item.meal_slot_id === slot.id).length;
          const slotAttendance = attendance.data.filter((item) => item.meal_slot_id === slot.id).length;
          return <article className="compact-list-row" key={slot.id}><div><strong>{slot.title}</strong><span>Confirmed reservations · last seven days</span></div><span>{slotBookings} booked · {slotAttendance} checked in</span></article>;
        })}</div>
      </section>
      <p className="system-note">Unclaimed reservations are only a planning signal. This app does not measure food produced, served, or discarded, so these figures are not physical food-waste measurements.</p>
    </DashboardShell>
  );
}
