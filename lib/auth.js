import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { getSupabaseConfig } from "./supabase/config";

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  if (authError?.name === "AuthSessionMissingError") {
    return null;
  }
  if (authError) {
    throw new Error(`Could not verify your session: ${authError.message}`);
  }
  const userId = authData?.claims?.sub;
  if (typeof userId !== "string") {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Could not load your account: ${profileError.message}`);
  }

  return profile ? { ...profile, userId } : null;
}

export function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/student";
}

export async function requireRole(allowedRoles) {
  if (!getSupabaseConfig()) {
    redirect("/");
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!allowedRoles.includes(profile.role)) {
    redirect(roleHome(profile.role));
  }
  return profile;
}
