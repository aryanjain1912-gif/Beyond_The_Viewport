import Link from "next/link";
import DashboardShell from "../components/DashboardShell";
import MealScanner from "../components/MealScanner";
import { ScreenHeading, StatGrid } from "../components/ScreenHeading";
import { requireRole } from "../../lib/auth";
import { getLocalDate } from "../../lib/date";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const metadata = { title: "Staff check-in · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StaffHome() {
  const profile = await requireRole(["staff", "admin"]);
  const supabase = await createSupabaseServerClient();
  const today = getLocalDate();
  const [bookings, attendance, recent, dietaryNotes] = await Promise.all([
    supabase.from("meal_bookings").select("id", { count: "exact", head: true }).eq("meal_date", today).eq("status", "booked"),
    supabase.from("meal_attendance").select("id", { count: "exact", head: true }).eq("meal_date", today),
    supabase.rpc("staff_attendance_history", { p_limit: 8 }),
    supabase.rpc("staff_dietary_notes", { p_meal_date: today }),
  ]);
  for (const result of [bookings, attendance, recent, dietaryNotes]) {
    if (result.error) throw new Error(`Could not load the staff dashboard: ${result.error.message}`);
  }

  return (
    <DashboardShell profile={profile} active="/staff">
      <ScreenHeading eyebrow="REFECTORY OPERATIONS" title="Meal check-in" description="Scan a one-use pass to verify a student's booking at the counter." />
      <StatGrid stats={[
        { label: "BOOKED TODAY", value: bookings.count ?? 0, detail: "active reservations" },
        { label: "CHECKED IN", value: attendance.count ?? 0, detail: "verified passes" },
        { label: "PENDING", value: Math.max(0, (bookings.count ?? 0) - (attendance.count ?? 0)), detail: "booked, not checked in" },
      ]} />
      <MealScanner />
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">RECENT ACTIVITY</p><h2>Latest check-ins</h2></div><Link className="text-link" href="/staff/history">Full history →</Link></div>
        <div className="compact-list">
          {recent.data?.length ? recent.data.map((entry) => (
            <article className="compact-list-row" key={entry.attendance_id}>
              <div><strong>{entry.student_name}</strong><span>{entry.meal_title} · {entry.meal_date}</span></div>
              <span>{new Date(entry.checked_in_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</span>
            </article>
          )) : <p className="empty-inline">No check-ins recorded yet today.</p>}
        </div>
      </section>
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">KITCHEN PREPARATION</p><h2>Dietary notes for today</h2></div></div>
        {dietaryNotes.data?.length ? (
          <div className="compact-list">
            {dietaryNotes.data.map((entry, index) => (
              <article className="compact-list-row" key={`${entry.student_name}-${entry.meal_title}-${index}`}>
                <div><strong>{entry.student_name} · {entry.meal_title}</strong><span>{entry.preferences.map((item) => item.replaceAll("_", " ")).join(", ") || "Additional kitchen note"}</span></div>
                {entry.notes && <span>{entry.notes}</span>}
              </article>
            ))}
          </div>
        ) : <p className="empty-inline">No dietary preferences have been recorded for today&apos;s bookings.</p>}
      </section>
      <div className="notice-card"><strong>Going offline?</strong><p>Open the <Link href="/offline-scan">offline scanner</Link> while connected so the app shell and camera code are cached. Scans captured offline are pending until verified after reconnecting.</p></div>
    </DashboardShell>
  );
}
