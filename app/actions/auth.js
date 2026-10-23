"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { roleHome } from "../../lib/auth";
import { getSupabaseConfig } from "../../lib/supabase/config";

export async function signInAction(_previousState, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return { error: "Enter a valid email address and password." };
  }

  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add the project URL and publishable key to .env.local." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Sign-in did not return an account. Please try again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profileError) {
    return { error: `Your account profile could not be loaded: ${profileError.message}` };
  }
  redirect(roleHome(profile.role));
}

export async function signUpAction(_previousState, formData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Your name must be between 2 and 80 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Use a password with at least 8 characters." };
  }

  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add the project URL and publishable key to .env.local." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm?next=/student`,
    },
  });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Account creation did not return a user. Please try again." };
  }

  if (data.session) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError) {
      return { error: `Your account was created, but the profile could not be loaded: ${profileError.message}` };
    }
    redirect(roleHome(profile.role));
  }

  return {
    success: "Your account was created. Check your email to confirm it, then sign in.",
  };
}

export async function requestPasswordResetAction(_previousState, formData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add the project URL and publishable key to .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { success: "If an account exists for that address, a password reset link is on its way." };
}

export async function updatePasswordAction(_previousState, formData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add the project URL and publishable key to .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Open the password reset link from your email first." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/student");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Could not sign out: ${error.message}`);
  }
  redirect("/login");
}
