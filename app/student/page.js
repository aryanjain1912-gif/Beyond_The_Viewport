import DashboardShell from "../components/DashboardShell";
import MealPass from "../components/MealPass";
import MealList from "../components/MealList";
import { ScreenHeading, StatGrid } from "../components/ScreenHeading";
import BrandEmblem from "../components/BrandEmblem";
import { requireRole } from "../../lib/auth";
import { formatDate, getLocalDate } from "../../lib/date";
import { loadMenusForDate } from "../../lib/menu-data";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export const metadata = { title: "Student overview · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const profile = await requireRole(["student"]);
  const supabase = await createSupabaseServerClient();
  const today = getLocalDate();
  const localHour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
  const greeting = localHour < 12 ? "Good morning" : localHour < 17 ? "Good afternoon" : "Good evening";
  const monthStart = `${today.slice(0, 7)}-01`;
  const [slotsResult, menusResult, bookingsResult, attendanceResult] = await Promise.all([
    supabase.from("meal_slots").select("id, meal_key, title, starts_at, ends_at, cutoff_at").order("sort_order"),
    loadMenusForDate(supabase, today),
    supabase.from("meal_bookings").select("id, meal_slot_id, meal_date, status, redeemed_at").eq("student_id", profile.userId).eq("meal_date", today),
    supabase.from("meal_attendance").select("id", { count: "exact", head: true }).eq("student_id", profile.userId).gte("meal_date", monthStart).lte("meal_date", today),
  ]);
  for (const result of [slotsResult, menusResult, bookingsResult, attendanceResult]) {
    if (result.error) throw new Error(`Could not load the student dashboard: ${result.error.message}`);
  }

  const menus = (menusResult.data ?? []).map((menu) => ({
    ...menu,
    ...slotsResult.data.find((slot) => slot.id === menu.meal_slot_id),
  })).filter((meal) => meal.id && meal.title).sort((a, b) => a.sort_order - b.sort_order);
  const booked = (bookingsResult.data ?? []).filter((booking) => booking.status === "booked").length;
  const monthBookings = await supabase.from("meal_bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", profile.userId)
    .eq("status", "booked")
    .gte("meal_date", monthStart)
    .lte("meal_date", today);
  if (monthBookings.error) throw new Error(`Could not load monthly booking totals: ${monthBookings.error.message}`);

  return (
    <DashboardShell profile={profile} active="/student">
      <div className="student-dashboard-hero">
        <ScreenHeading
          eyebrow="STUDENT REFECTORY · YOUR DAILY TABLE"
          title={`${greeting}, ${profile.full_name.split(/\s+/)[0]}.`}
          description="Your meals, booking status, and one-use passes — all in one place."
          action={{ href: "/student/menu", label: "Browse menus" }}
        />
        <div className="student-date-stamp" aria-label={formatDate(today, { weekday: "long", day: "numeric", month: "long" })}>
          <BrandEmblem className="student-date-emblem" />
          <span>{formatDate(today, { weekday: "long" }).toUpperCase()}</span>
          <strong>{formatDate(today, { day: "numeric" })}</strong>
          <small>{formatDate(today, { month: "long", year: "numeric" }).toUpperCase()}</small>
        </div>
      </div>
      <StatGrid stats={[
        { label: "BOOKED TODAY", value: booked, detail: "confirmed meals" },
        { label: "CHECK-INS THIS MONTH", value: attendanceResult.count ?? 0, detail: "verified at the counter" },
        { label: "MEALS BOOKED THIS MONTH", value: monthBookings.count ?? 0, detail: "booking total" },
      ]} />
      <section className="section-block">
        <div className="section-title-row">
          <div><p className="section-kicker">FROM THE REFECTORY</p><h2>Today&apos;s table</h2></div>
          <span className="live-label"><i /> LIVE MENU</span>
        </div>
        <MealList date={today} meals={menus} bookings={bookingsResult.data ?? []} today={today} />
      </section>
      <section className="section-block">
        <div className="section-title-row"><div><p className="section-kicker">BOOKED FOR TODAY</p><h2>Your meal passes</h2></div></div>
        {(bookingsResult.data ?? []).filter((booking) => booking.status === "booked" && !booking.redeemed_at).length ? (
          <div className="pass-grid">
            {(bookingsResult.data ?? []).filter((booking) => booking.status === "booked" && !booking.redeemed_at).map((booking) => {
              const slot = slotsResult.data.find((item) => item.id === booking.meal_slot_id);
              if (!slot) return null;
              return <div id={`pass-${slot.id}`} key={booking.id}><MealPass mealSlotId={slot.id} mealDate={today} /></div>;
            })}
          </div>
        ) : (
          <div className="empty-state compact"><span aria-hidden="true">◈</span><p>Book a meal to generate a one-use pass for today.</p></div>
        )}
      </section>
      <section className="notice-card"><strong>Booking cutoff</strong><p>Each meal closes at its published cutoff time. The database enforces the deadline using Asia/Kolkata time, even if you leave this page open.</p></section>
    </DashboardShell>
  );
}
