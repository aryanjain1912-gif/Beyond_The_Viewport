import DashboardShell from "../../components/DashboardShell";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { formatDate } from "../../../lib/date";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Attendance history · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StaffHistory() {
  const profile = await requireRole(["staff", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("staff_attendance_history", { p_limit: 200 });
  if (error) throw new Error(`Could not load attendance history: ${error.message}`);

  return (
    <DashboardShell profile={profile} active="/staff/history">
      <ScreenHeading eyebrow="REFECTORY RECORDS" title="Attendance history" description="Verified check-ins, including scans synchronized from an offline device." />
      {data?.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>STUDENT</th><th>MEAL</th><th>DATE</th><th>CHECKED IN</th><th>DEVICE</th></tr></thead>
            <tbody>{data.map((entry) => (
              <tr key={entry.attendance_id}>
                <td>{entry.student_name}</td>
                <td>{entry.meal_title}</td>
                <td>{formatDate(entry.meal_date, { day: "numeric", month: "short", year: "numeric" })}</td>
                <td>{new Date(entry.checked_in_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</td>
                <td>{entry.synced_from_offline ? "Offline sync" : "Live scan"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty-state"><span>◷</span><h2>No check-ins yet</h2><p>Successful meal pass verifications will appear here.</p></div>}
    </DashboardShell>
  );
}
