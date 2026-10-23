import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getSupabaseConfig } from "../../../lib/supabase/config";

const allowedTypes = new Set(["signup", "recovery", "invite", "magiclink", "email", "email_change"]);
const allowedNextPaths = new Set(["/student", "/reset-password"]);

function safeNextPath(value) {
  return allowedNextPaths.has(value) ? value : "/student";
}

function redirectTo(request, path, error) {
  const target = new URL(path, request.url);
  if (error) target.searchParams.set("error", error);
  return NextResponse.redirect(target);
}

export async function GET(request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));
  if (!getSupabaseConfig()) return redirectTo(request, "/login", "setup");

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && allowedTypes.has(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("The confirmation link is incomplete or invalid.") };

  if (error) return redirectTo(request, "/login", "confirmation");
  return redirectTo(request, nextPath);
}
