import DashboardShell from "../../components/DashboardShell";
import PreferencesForm from "../../components/PreferencesForm";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Dietary preferences · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StudentPreferences() {
  const profile = await requireRole(["student"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("dietary_preferences")
    .select("preferences, notes")
    .eq("student_id", profile.userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load dietary preferences: ${error.message}`);

  return (
    <DashboardShell profile={profile} active="/student/preferences">
      <ScreenHeading eyebrow="YOUR ACCOUNT" title="Dietary preferences" description="Share your preferences with the kitchen so staff can plan ahead." />
      <PreferencesForm savedPreferences={data?.preferences ?? []} notes={data?.notes ?? ""} />
    </DashboardShell>
  );
}
