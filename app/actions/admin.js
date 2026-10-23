"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { isValidDate } from "../../lib/date";
import { parseDishRows } from "../../lib/menu";

async function getAdminContext() {
  if (!getSupabaseConfig()) {
    return { error: "Supabase is not configured. Add your project settings to .env.local." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Sign in with an administrator account." };

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (profile.role !== "admin") return { error: "Administrator access is required." };
  return { supabase, userId: authData.user.id };
}

export async function saveMenuAction(_previousState, formData) {
  const mealDate = String(formData.get("meal_date") ?? "");
  const mealSlotId = String(formData.get("meal_slot_id") ?? "");
  const parsedDishes = parseDishRows(formData.get("dishes"));
  const notes = String(formData.get("notes") ?? "").trim();
  if (!isValidDate(mealDate) || !/^[0-9a-f-]{36}$/i.test(mealSlotId)) return { error: "Select a valid menu date and meal." };
  if (parsedDishes.error) return { error: parsedDishes.error };
  const menuText = parsedDishes.dishes.map((dish) => dish.name).join(" · ");
  if (menuText.length > 500) return { error: "Combined dish names must be 500 characters or fewer." };
  if (notes.length > 500) return { error: "Notes must be 500 characters or fewer." };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };

  const { error } = await context.supabase.from("meal_menus").upsert({
    meal_date: mealDate,
    meal_slot_id: mealSlotId,
    menu_text: menuText,
    dishes: parsedDishes.dishes,
    notes,
    is_vegetarian: formData.get("is_vegetarian") === "on",
    created_by: context.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "meal_date,meal_slot_id" });
  if (error) return { error: error.message };
  revalidatePath("/admin/menus");
  revalidatePath("/student");
  revalidatePath("/student/menu");
  return { success: "Menu published." };
}

export async function updateScheduleAction(_previousState, formData) {
  const id = String(formData.get("meal_slot_id") ?? "");
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  const cutoffAt = String(formData.get("cutoff_at") ?? "");
  const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!/^[0-9a-f-]{36}$/i.test(id) || ![startsAt, endsAt, cutoffAt].every(validTime)) {
    return { error: "Enter a valid meal slot and time." };
  }
  if (startsAt >= endsAt || cutoffAt >= endsAt) return { error: "The cutoff and start time must be before the meal end time." };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { error } = await context.supabase.from("meal_slots")
    .update({ starts_at: startsAt, ends_at: endsAt, cutoff_at: cutoffAt })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/schedule");
  revalidatePath("/student");
  revalidatePath("/student/menu");
  return { success: "Meal schedule updated." };
}

export async function changeRoleAction(_previousState, formData) {
  const id = String(formData.get("profile_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["student", "staff", "admin"].includes(role)) {
    return { error: "Select a valid account and role." };
  }
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  if (id === context.userId) return { error: "You cannot change your own administrator role." };
  const { error } = await context.supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/accounts");
  return { success: "Account role updated." };
}

export async function createRebateAction(_previousState, formData) {
  const studentId = String(formData.get("student_id") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { error: "Select a valid student account." };
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount)) return { error: "Enter an amount with up to two decimal places." };
  if (kind !== "credit" && kind !== "debit") return { error: "Select whether this entry is a credit or debit." };
  if (reason.length < 3 || reason.length > 300) return { error: "The reason must be between 3 and 300 characters." };
  const paise = Math.round(Number(amount) * 100) * (kind === "credit" ? 1 : -1);
  if (paise === 0 || !Number.isSafeInteger(paise)) return { error: "Enter an amount greater than zero." };
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { error } = await context.supabase.from("rebate_entries").insert({
    student_id: studentId,
    created_by: context.userId,
    amount_paise: paise,
    reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/rebates");
  revalidatePath("/student/rebates");
  return { success: "Rebate ledger entry added." };
}

export async function saveAllowanceAction(_previousState, formData) {
  const allowance = Number(formData.get("monthly_meal_allowance"));
  if (!Number.isInteger(allowance) || allowance < 1 || allowance > 300) {
    return { error: "Monthly meal allowance must be between 1 and 300." };
  }
  const context = await getAdminContext();
  if (context.error) return { error: context.error };
  const { error } = await context.supabase.from("app_settings").update({
    monthly_meal_allowance: allowance,
    updated_at: new Date().toISOString(),
  }).eq("singleton", true);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { success: "Meal allowance updated." };
}
