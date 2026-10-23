import DashboardShell from "../../components/DashboardShell";
import { ScheduleEditor } from "../../components/AdminForms";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Meal schedule · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function AdminSchedule() {
  const profile = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("meal_slots")
    .select("id, title, starts_at, ends_at, cutoff_at")
    .order("sort_order");
  if (error) throw new Error(`Could not load meal schedules: ${error.message}`);

  return (
    <DashboardShell profile={profile} active="/admin/schedule">
      <ScreenHeading eyebrow="ADMINISTRATION" title="Meal schedules" description="Update serving times and booking cutoff times for each meal." />
      <div className="schedule-list">{data.map((slot) => <ScheduleEditor slot={slot} key={slot.id} />)}</div>
      <p className="system-note">Cutoffs are enforced in the database using the Asia/Kolkata timezone. An update affects future booking and cancellation requests.</p>
    </DashboardShell>
  );
}
