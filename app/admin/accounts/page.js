import DashboardShell from "../../components/DashboardShell";
import { RoleEditor } from "../../components/AdminForms";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Accounts & roles · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function AdminAccounts() {
  const profile = await requireRole(["admin"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load accounts: ${error.message}`);

  return (
    <DashboardShell profile={profile} active="/admin/accounts">
      <ScreenHeading eyebrow="ACCESS CONTROL" title="Accounts & roles" description="New accounts are students. Assign staff and administrator privileges only to trusted, registered accounts." />
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>ACCOUNT</th><th>REGISTERED</th><th>ROLE</th><th>UPDATE ROLE</th></tr></thead>
          <tbody>{(data ?? []).map((account) => (
            <tr key={account.id}>
              <td><strong>{account.full_name}</strong><small>{account.email}</small></td>
              <td>{new Date(account.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</td>
              <td><span className="table-status booked">{account.role}</span></td>
              <td><RoleEditor profile={account} isCurrentUser={account.id === profile.userId} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="system-note">Accounts shown are limited to the first 200 most recently registered users.</p>
    </DashboardShell>
  );
}
