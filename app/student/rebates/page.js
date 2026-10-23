import DashboardShell from "../../components/DashboardShell";
import { ScreenHeading, StatGrid } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Rebate ledger · Mystic Sanctum" };
export const dynamic = "force-dynamic";

function formatAmount(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export default async function StudentRebates() {
  const profile = await requireRole(["student"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("rebate_entries")
    .select("id, amount_paise, reason, created_at")
    .eq("student_id", profile.userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your rebate ledger: ${error.message}`);

  const balance = (data ?? []).reduce((sum, entry) => sum + entry.amount_paise, 0);
  return (
    <DashboardShell profile={profile} active="/student/rebates">
      <ScreenHeading eyebrow="YOUR ACCOUNT" title="Rebate ledger" description="A transparent record of meal credits and adjustments." />
      <StatGrid stats={[
        { label: "CURRENT CREDIT", value: formatAmount(balance), detail: "net ledger balance" },
        { label: "ENTRIES", value: data?.length ?? 0, detail: "account adjustments" },
        { label: "ACCOUNT", value: "Student", detail: profile.email },
      ]} />
      {data?.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>DATE</th><th>REASON</th><th>AMOUNT</th></tr></thead>
            <tbody>{data.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</td>
                <td>{entry.reason}</td>
                <td className={entry.amount_paise > 0 ? "credit-amount" : "debit-amount"}>{formatAmount(entry.amount_paise)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="empty-state"><span>✧</span><h2>No ledger entries</h2><p>Your refectory administrator will add credits or adjustments here.</p></div>}
    </DashboardShell>
  );
}
