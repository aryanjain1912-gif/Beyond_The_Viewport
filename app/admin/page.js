import Link from "next/link";
import DashboardShell from "../components/DashboardShell";
import { AllowanceEditor } from "../components/AdminForms";
import { ScreenHeading, StatGrid } from "../components/ScreenHeading";
import { requireRole } from "../../lib/auth";
import { getLocalDate } from "../../lib/date";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const metadata = { title: "Administrator overview · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const profile = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const today = getLocalDate();
  const [students, bookings, attendance, menus, settings, rebates] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("meal_bookings").select("id", { count: "exact", head: true }).eq("meal_date", today).eq("status", "booked"),
    supabase.from("meal_attendance").select("id", { count: "exact", head: true }).eq("meal_date", today),
    supabase.from("meal_menus").select("id", { count: "exact", head: true }).eq("meal_date", today),
    supabase.from("app_settings").select("monthly_meal_allowance").eq("singleton", true).single(),
    supabase.from("rebate_entries").select("amount_paise"),
  ]);
  for (const result of [students, bookings, attendance, menus, settings, rebates]) {
    if (result.error) throw new Error(`Could not load the administrator overview: ${result.error.message}`);
  }
  const rebateBalance = (rebates.data ?? []).reduce((sum, entry) => sum + entry.amount_paise, 0);

  return (
    <DashboardShell profile={profile} active="/admin">
      <ScreenHeading eyebrow="REFECTORY CONTROL ROOM" title="Administrator overview" description="Manage meals, staff access, attendance, and student account adjustments." />
      <StatGrid stats={[
        { label: "STUDENT ACCOUNTS", value: students.count ?? 0, detail: "registered students" },
        { label: "BOOKED TODAY", value: bookings.count ?? 0, detail: "active meal reservations" },
        { label: "CHECKED IN TODAY", value: attendance.count ?? 0, detail: "verified attendance" },
        { label: "TODAY'S MENUS", value: menus.count ?? 0, detail: "of 3 meal slots" },
      ]} />
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">REFECTORY TOOLS</p><h2>Manage daily operations</h2></div></div>
        <div className="tool-grid">
          <Link className="tool-card" href="/admin/menus"><span>♧</span><h3>Publish menus</h3><p>Set meal details and kitchen notes for any date.</p><b>Manage menus →</b></Link>
          <Link className="tool-card" href="/admin/schedule"><span>◷</span><h3>Meal schedule</h3><p>Set serving times and enforceable booking cutoffs.</p><b>Manage schedule →</b></Link>
          <Link className="tool-card" href="/admin/accounts"><span>◇</span><h3>Accounts & roles</h3><p>Grant staff access to registered student accounts.</p><b>Manage accounts →</b></Link>
          <Link className="tool-card" href="/admin/reports"><span>◌</span><h3>Reports & waste</h3><p>Compare active bookings with verified check-ins.</p><b>View reports →</b></Link>
          <Link className="tool-card" href="/admin/rebates"><span>✧</span><h3>Rebate ledger</h3><p>Record and review student meal credits.</p><b>Manage rebates →</b></Link>
        </div>
      </section>
      <section className="settings-card">
        <div><p className="section-kicker">STUDENT ALLOWANCE</p><h2>Monthly meal allowance</h2><p>Used to provide a reference in student meal planning. The system does not charge or bill students automatically.</p></div>
        <AllowanceEditor currentValue={settings.data.monthly_meal_allowance} />
        <p className="ledger-total">Total rebate ledger balance: <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rebateBalance / 100)}</strong></p>
      </section>
    </DashboardShell>
  );
}
