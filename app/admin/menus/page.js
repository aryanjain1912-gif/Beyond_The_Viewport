import DashboardShell from "../../components/DashboardShell";
import DateNavigation from "../../components/DateNavigation";
import { MenuEditor } from "../../components/AdminForms";
import { ScreenHeading } from "../../components/ScreenHeading";
import { requireRole } from "../../../lib/auth";
import { getLocalDate, isValidDate } from "../../../lib/date";
import { loadMenusForDate } from "../../../lib/menu-data";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const metadata = { title: "Menu management · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function AdminMenus({ searchParams }) {
  const profile = await requireRole(["admin"]);
  const params = await searchParams;
  const today = getLocalDate();
  const date = isValidDate(params?.date) ? params.date : today;
  const supabase = await createSupabaseServerClient();
  const [slots, menus] = await Promise.all([
    supabase.from("meal_slots").select("id, title, sort_order").order("sort_order"),
    loadMenusForDate(supabase, date),
  ]);
  for (const result of [slots, menus]) {
    if (result.error) throw new Error(`Could not load menu management: ${result.error.message}`);
  }
  const menuBySlot = new Map((menus.data ?? []).map((menu) => [menu.meal_slot_id, menu]));

  return (
    <DashboardShell profile={profile} active="/admin/menus">
      <ScreenHeading eyebrow="ADMINISTRATION" title="Menus & kitchen notes" description="Publish the daily menu so students can make reservations." />
      <DateNavigation date={date} today={today} basePath="/admin/menus" />
      {!menus.dishesAvailable && (
        <p className="form-feedback error" role="status">
          Dish-card storage is not enabled in this Supabase database. Run <code>supabase/migrations/20261023000000_menu_dishes.sql</code> in the project connected to production to publish menu changes.
        </p>
      )}
      <MenuEditor slots={slots.data ?? []} date={date} menus={menus.data ?? []} dishesAvailable={menus.dishesAvailable} />
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">PUBLISHED FOR {date}</p><h2>Current menu</h2></div></div>
        <div className="compact-list">
          {(slots.data ?? []).map((slot) => {
            const menu = menuBySlot.get(slot.id);
            return <article className="compact-list-row" key={slot.id}><div><strong>{slot.title}</strong><span>{menu?.menu_text ?? "Not published"}</span></div><span>{menu ? menu.notes || (menu.is_vegetarian ? "Vegetarian" : "Menu published") : "Awaiting menu"}</span></article>;
          })}
        </div>
      </section>
    </DashboardShell>
  );
}
