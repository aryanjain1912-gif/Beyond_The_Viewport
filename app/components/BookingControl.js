"use client";

import { useActionState } from "react";
import { changeBookingAction } from "../actions/student";

export default function BookingControl({ mealSlotId, mealDate, status }) {
  const [state, action, pending] = useActionState(changeBookingAction, {});
  const booked = status === "booked";

  return (
    <div className="booking-control">
      <form action={action}>
        <input type="hidden" name="meal_slot_id" value={mealSlotId} />
        <input type="hidden" name="meal_date" value={mealDate} />
        <input type="hidden" name="operation" value={booked ? "cancel" : "book"} />
        <button className={`button ${booked ? "button-quiet" : "button-primary"}`} disabled={pending}>
          {pending ? "Saving…" : booked ? "Cancel booking" : "Book meal"}
        </button>
      </form>
      {state.error && <p className="inline-feedback error" role="alert">{state.error}</p>}
      {state.success && <p className="inline-feedback success" role="status">{state.success}</p>}
    </div>
  );
}
