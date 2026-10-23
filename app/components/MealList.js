import Link from "next/link";
import BookingControl from "./BookingControl";
import CutoffCountdown from "./CutoffCountdown";
import { formatTime } from "../../lib/date";
import { getMenuDishes } from "../../lib/menu";
import Image from "next/image";

export default function MealList({ date, meals, bookings = [], today }) {
  const bookingBySlot = new Map(bookings.map((booking) => [booking.meal_slot_id, booking]));

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <span aria-hidden="true">✦</span>
        <h2>No menu published yet</h2>
        <p>The refectory has not added a menu for this day. Check again later or ask staff for the latest menu.</p>
      </div>
    );
  }

  return (
    <div className="meal-cards">
      {meals.map((meal) => {
        const booking = bookingBySlot.get(meal.meal_slot_id);
        const dishes = getMenuDishes(meal);
        return (
          <article className={`meal-card meal-card-${meal.meal_key}`} key={meal.id}>
            <div className="meal-card-top">
              <div className="meal-symbol" aria-hidden="true">{meal.meal_key === "breakfast" ? "☼" : meal.meal_key === "lunch" ? "◉" : "☾"}</div>
              <div className="meal-card-time">{formatTime(meal.starts_at)} – {formatTime(meal.ends_at)}</div>
              <span className={`meal-status ${booking?.status === "booked" ? "gold" : meal.meal_date < today ? "muted" : "green"}`}>
                {booking?.redeemed_at ? "CHECKED IN" : booking?.status === "booked" ? "BOOKED" : meal.meal_date < today ? "PAST" : "OPEN"}
              </span>
            </div>
            <h2>{meal.title}</h2>
            <div className="meal-menu-dishes">
              {dishes.map((dish, index) => (
                <article className="meal-dish-card" key={`${dish.name}-${index}`}>
                  <div className="meal-dish-photo">
                    <Image src={dish.image_url} alt="" fill sizes="(max-width: 620px) 80vw, (max-width: 1100px) 34vw, 22vw" />
                  </div>
                  <h3>{dish.name}</h3>
                </article>
              ))}
            </div>
            <p className="meal-cutoff">
              BOOKING CUTOFF <strong>{formatTime(meal.cutoff_at)}</strong>
              {date === today && <CutoffCountdown cutoffAt={`${date}T${meal.cutoff_at}+05:30`} />}
            </p>
            {meal.notes && <p className="meal-note">{meal.notes}</p>}
            {meal.is_vegetarian && <span className="diet-tag">VEGETARIAN</span>}
            <div className="meal-card-bottom">
              {date === today || date > today ? (
                <BookingControl mealSlotId={meal.meal_slot_id} mealDate={date} status={booking?.status} />
              ) : (
                <span className="past-meal">Past meal</span>
              )}
              {booking?.status === "booked" && date === today && (
                <Link className="text-link" href={`/student#pass-${meal.meal_slot_id}`}>Meal pass <span>↗</span></Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
