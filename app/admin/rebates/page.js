import DashboardShell from "../../components/DashboardShell";
import { RebateEditor } from "../../components/AdminForms";
import { ScreenHeading, StatGrid } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Rebate ledger · Mystic Sanctum" };
export const dynamic = "force-dynamic";

function formatAmount(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export default async function AdminRebates() {
  const profile = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const [students, entries] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "student").order("full_name").limit(200),
    supabase.from("rebate_entries").select("id, student_id, amount_paise, reason, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const result of [students, entries]) {
    if (result.error) throw new Error(`Could not load rebate ledger: ${result.error.message}`);
  }
  const names = new Map((students.data ?? []).map((student) => [student.id, student.full_name]));
  const total = (entries.data ?? []).reduce((sum, entry) => sum + entry.amount_paise, 0);

  return (
    <DashboardShell profile={profile} active="/admin/rebates">
      <ScreenHeading eyebrow="STUDENT ACCOUNTS" title="Rebate ledger" description="Record manual meal credits and adjustments. This ledger does not move money or issue automated refunds." />
      <StatGrid stats={[
        { label: "STUDENT ACCOUNTS", value: students.data?.length ?? 0, detail: "eligible ledger accounts" },
        { label: "RECENT ENTRIES", value: entries.data?.length ?? 0, detail: "latest 100 adjustments" },
        { label: "NET RECENT BALANCE", value: formatAmount(total), detail: "ledger entries shown" },
      ]} />
      <RebateEditor students={students.data ?? []} />
      {entries.data?.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>DATE</th><th>STUDENT</th><th>REASON</th><th>AMOUNT</th></tr></thead>
            <tbody>{entries.data.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</td>
                <td>{names.get(entry.student_id) ?? "Account"}</td>
                <td>{entry.reason}</td>
                <td className={entry.amount_paise > 0 ? "credit-amount" : "debit-amount"}>{formatAmount(entry.amount_paise)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty-state"><span>✧</span><h2>No rebate entries</h2><p>Use the form above to record a student credit or adjustment.</p></div>}
    </DashboardShell>
  );
}
