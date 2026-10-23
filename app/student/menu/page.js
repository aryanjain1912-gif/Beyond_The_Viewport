import DashboardShell from "../../components/DashboardShell";
import DateNavigation from "../../components/DateNavigation";
import MealList from "../../components/MealList";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { getLocalDate, isValidDate } from "../../../lib/date";
import { loadMenusForDate } from "../../../lib/menu-data";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Menus & bookings · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StudentMenu({ searchParams }) {
  const profile = await requireRole(["student"]);
  const params = await searchParams;
  const today = getLocalDate();
  const date = isValidDate(params?.date) ? params.date : today;
  const supabase = await createSupabaseServerClient();
  const [slotsResult, menusResult, bookingsResult] = await Promise.all([
    supabase.from("meal_slots").select("id, meal_key, title, starts_at, ends_at, cutoff_at, sort_order").order("sort_order"),
    loadMenusForDate(supabase, date),
    supabase.from("meal_bookings").select("id, meal_slot_id, status, redeemed_at").eq("student_id", profile.userId).eq("meal_date", date),
  ]);
  for (const result of [slotsResult, menusResult, bookingsResult]) {
    if (result.error) throw new Error(`Could not load the menu: ${result.error.message}`);
  }
  const meals = (menusResult.data ?? []).map((menu) => ({
    ...menu,
    ...slotsResult.data.find((slot) => slot.id === menu.meal_slot_id),
  })).filter((meal) => meal.id && meal.title).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <DashboardShell profile={profile} active="/student/menu">
      <ScreenHeading eyebrow="MENUS & BOOKINGS" title="Find your next meal." description="Browse published meals and change a booking before its cutoff." />
      <DateNavigation date={date} today={today} />
      <MealList date={date} meals={meals} bookings={bookingsResult.data ?? []} today={today} />
      <p className="system-note">Menu availability and cutoff rules are enforced by the refectory database. Menu notes may include sample content.</p>
    </DashboardShell>
  );
}
