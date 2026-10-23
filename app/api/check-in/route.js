import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: "Sign in with a staff account to check in a meal pass." }, { status: 401 });
  }
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!["staff", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only refectory staff can verify meal passes." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.token !== "string" || body.token.length > 100 || !body.token.startsWith("MS1.")) {
    return NextResponse.json({ error: "The meal pass code is invalid." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("redeem_meal_pass", {
    p_token: body.token,
    p_synced_from_offline: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json(data);
}
