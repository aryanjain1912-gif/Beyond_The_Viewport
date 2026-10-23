const MENU_FIELDS = "id, meal_slot_id, meal_date, menu_text, dishes, notes, is_vegetarian";
const LEGACY_MENU_FIELDS = "id, meal_slot_id, meal_date, menu_text, notes, is_vegetarian";

export function isMissingDishesColumn(error) {
  return ["42703", "PGRST204"].includes(error?.code)
    || /meal_menus\.dishes.*does not exist|column .*dishes.*not found|could not find .*dishes.*column/i.test(error?.message ?? "");
}

export async function loadMenusForDate(supabase, date) {
  const current = await supabase.from("meal_menus").select(MENU_FIELDS).eq("meal_date", date);
  if (!isMissingDishesColumn(current.error)) {
    return { ...current, dishesAvailable: !current.error };
  }

  const legacy = await supabase.from("meal_menus").select(LEGACY_MENU_FIELDS).eq("meal_date", date);
  if (legacy.error) return { ...legacy, dishesAvailable: false };

  return {
    ...legacy,
    data: (legacy.data ?? []).map((menu) => ({ ...menu, dishes: [] })),
    dishesAvailable: false,
  };
}
