import DashboardShell from "../../components/DashboardShell";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { formatDate, formatTime } from "../../../lib/date";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Meal history · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StudentHistory() {
  const profile = await requireRole(["student"]);
  const supabase = await createSupabaseServerClient();
  const [bookingsResult, slotsResult, attendanceResult] = await Promise.all([
    supabase.from("meal_bookings").select("id, meal_date, meal_slot_id, status, redeemed_at, created_at").eq("student_id", profile.userId).order("meal_date", { ascending: false }).limit(60),
    supabase.from("meal_slots").select("id, title, starts_at, ends_at"),
    supabase.from("meal_attendance").select("booking_id, checked_in_at").eq("student_id", profile.userId),
  ]);
  for (const result of [bookingsResult, slotsResult, attendanceResult]) {
    if (result.error) throw new Error(`Could not load meal history: ${result.error.message}`);
  }
  const checkins = new Map((attendanceResult.data ?? []).map((item) => [item.booking_id, item]));

  return (
    <DashboardShell profile={profile} active="/student/history">
      <ScreenHeading eyebrow="YOUR REFECTORY RECORD" title="Meal history" description="Your recent reservations and verified counter check-ins." />
      {bookingsResult.data?.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>DATE</th><th>MEAL</th><th>TIME</th><th>BOOKING</th><th>ATTENDANCE</th></tr></thead>
            <tbody>{bookingsResult.data.map((booking) => {
              const slot = slotsResult.data.find((item) => item.id === booking.meal_slot_id);
              const checkin = checkins.get(booking.id);
              return (
                <tr key={booking.id}>
                  <td>{formatDate(booking.meal_date, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>{slot?.title ?? "Meal"}</td>
                  <td>{slot ? `${formatTime(slot.starts_at)} – ${formatTime(slot.ends_at)}` : "—"}</td>
                  <td><span className={`table-status ${booking.status}`}>{booking.status}</span></td>
                  <td>{checkin ? `Checked in ${new Date(checkin.checked_in_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}` : "Not checked in"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <div className="empty-state"><span>◷</span><h2>No meal activity yet</h2><p>Your bookings and check-ins will appear here.</p></div>}
    </DashboardShell>
  );
}
