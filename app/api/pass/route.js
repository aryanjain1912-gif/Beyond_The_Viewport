import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }
  if (!authData.user) {
    return NextResponse.json({ error: "Sign in to request a meal pass." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (
    typeof body.meal_slot_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.meal_slot_id) ||
    typeof body.meal_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.meal_date)
  ) {
    return NextResponse.json({ error: "Provide a valid meal slot and date." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("issue_meal_pass", {
    p_meal_slot_id: body.meal_slot_id,
    p_meal_date: body.meal_date,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: slot, error: slotError } = await supabase
    .from("meal_slots")
    .select("title, starts_at, ends_at")
    .eq("id", body.meal_slot_id)
    .single();
  if (slotError) {
    return NextResponse.json({ error: `Pass created, but meal details could not be loaded: ${slotError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ...data,
    meal: slot.title,
    time: `${slot.starts_at.slice(0, 5)} — ${slot.ends_at.slice(0, 5)}`,
  });
}
