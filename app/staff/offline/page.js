import Link from "next/link";
import DashboardShell from "../../components/DashboardShell";
import MealScanner from "../../components/MealScanner";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";

export const metadata = { title: "Offline scan queue · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StaffOfflineQueue() {
  const profile = await requireRole(["staff", "admin"]);
  return (
    <DashboardShell profile={profile} active="/staff/offline">
      <ScreenHeading eyebrow="DEVICE QUEUE" title="Offline scan queue" description="Scan now, then synchronize with the server when the network is back." action={{ href: "/offline-scan", label: "Open offline scanner" }} />
      <MealScanner />
      <div className="notice-card"><strong>Server verification is authoritative</strong><p>Queued scans are not counted as attendance until the server validates their pass, booking, expiry, role, and single-use status.</p></div>
      <Link className="text-link" href="/staff/history">View attendance history →</Link>
    </DashboardShell>
  );
}
