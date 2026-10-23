import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: "Sign in with a staff account to synchronize queued scans." }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!["staff", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only refectory staff can synchronize check-ins." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.scans) || body.scans.length < 1 || body.scans.length > 50) {
    return NextResponse.json({ error: "Submit between 1 and 50 scans per synchronization." }, { status: 400 });
  }
  if (body.scans.some((scan) => typeof scan.token !== "string" || scan.token.length > 100 || !scan.token.startsWith("MS1."))) {
    return NextResponse.json({ error: "One or more queued pass codes are invalid." }, { status: 400 });
  }

  const results = [];
  for (const scan of body.scans) {
    const { data, error } = await supabase.rpc("redeem_meal_pass", {
      p_token: scan.token,
      p_synced_from_offline: true,
    });
    results.push(error
      ? { token: scan.token, scanned_at: scan.scanned_at, accepted: false, error: error.message }
      : { token: scan.token, scanned_at: scan.scanned_at, accepted: true, ...data });
  }
  return NextResponse.json({ results });
}
