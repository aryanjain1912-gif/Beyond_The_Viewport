"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { isValidDate } from "../../lib/date";

export async function changeBookingAction(_previousState, formData) {
  const mealSlotId = String(formData.get("meal_slot_id") ?? "");
  const mealDate = String(formData.get("meal_date") ?? "");
  const operation = String(formData.get("operation") ?? "");

  if (!/^[0-9a-f-]{36}$/i.test(mealSlotId) || !isValidDate(mealDate)) {
    return { error: "The meal selection is invalid. Refresh the page and try again." };
  }
  if (operation !== "book" && operation !== "cancel") {
    return { error: "Choose whether to book or cancel this meal." };
  }
  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add your project settings to .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc(
    operation === "book" ? "book_meal" : "cancel_meal_booking",
    { p_meal_slot_id: mealSlotId, p_meal_date: mealDate },
  );
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/student");
  revalidatePath("/student/menu");
  revalidatePath("/student/history");
  return { success: operation === "book" ? "Meal booked." : "Booking cancelled." };
}

const allowedPreferences = new Set([
  "vegetarian",
  "vegan",
  "no_onion_garlic",
  "no_dairy",
  "no_gluten",
  "no_nuts",
  "jain",
]);

export async function savePreferencesAction(_previousState, formData) {
  const preferences = formData.getAll("preferences").map(String);
  const notes = String(formData.get("notes") ?? "").trim();

  if (preferences.some((item) => !allowedPreferences.has(item))) {
    return { error: "One of the selected preferences is not supported." };
  }
  if (notes.length > 500) {
    return { error: "Additional notes must be 500 characters or fewer." };
  }
  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add your project settings to .env.local." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    return { error: authError.message };
  }
  if (!authData.user) {
    return { error: "Sign in again to save dietary preferences." };
  }

  const { error } = await supabase.from("dietary_preferences").upsert({
    student_id: authData.user.id,
    preferences,
    notes,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/student/preferences");
  revalidatePath("/admin");
  return { success: "Dietary preferences saved." };
}
