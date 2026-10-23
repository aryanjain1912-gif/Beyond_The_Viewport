"use client";

import { useActionState } from "react";
import {
  changeRoleAction,
  createRebateAction,
  saveAllowanceAction,
  saveMenuAction,
  updateScheduleAction,
} from "../actions/admin";
import { formatDishRows } from "../../lib/menu";

function Feedback({ state }) {
  if (state.error) return <p className="form-feedback error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-feedback success" role="status">{state.success}</p>;
  return null;
}

function MenuSlotEditor({ slot, date, menu, dishesAvailable }) {
  const [state, action, pending] = useActionState(saveMenuAction, {});
  return (
    <form className="surface-card admin-form" action={action}>
      <input type="hidden" name="meal_date" value={date} />
      <input type="hidden" name="meal_slot_id" value={slot.id} />
      <div className="menu-editor-heading">
        <div><p className="section-kicker">{menu ? "UPDATE PUBLISHED MENU" : "NEW MENU"}</p><h3>{slot.title}</h3></div>
      </div>
      <label className="field-label">Dish cards<textarea name="dishes" rows={4} defaultValue={formatDishRows(menu?.dishes, menu?.menu_text)} placeholder={"Dal makhani\nJeera rice\nTandoori roti | https://images.unsplash.com/photo-..."} required /></label>
      <p className="field-hint">One dish per line. Add “|” and a direct images.unsplash.com URL for a dish photo; blank uses a sample photo.</p>
      <label className="field-label">Kitchen notes<input name="notes" maxLength={500} defaultValue={menu?.notes ?? ""} placeholder="Optional notes or allergen details" /></label>
      <label className="preference-option"><input type="checkbox" name="is_vegetarian" defaultChecked={menu?.is_vegetarian ?? true} /><span>Entire meal is vegetarian</span></label>
      <Feedback state={state} />
      {!dishesAvailable && <p className="field-hint">Publishing is disabled until the dish-card migration is applied to the connected database.</p>}
      <button className="button button-primary" disabled={pending || !dishesAvailable}>{pending ? "Publishing…" : menu ? "Update menu" : "Publish menu"}</button>
    </form>
  );
}

export function MenuEditor({ slots, date, menus, dishesAvailable = true }) {
  const menuBySlot = new Map(menus.map((menu) => [menu.meal_slot_id, menu]));
  return (
    <div className="menu-editor-grid">
      {slots.map((slot) => <MenuSlotEditor key={slot.id} slot={slot} date={date} menu={menuBySlot.get(slot.id)} dishesAvailable={dishesAvailable} />)}
    </div>
  );
}

export function ScheduleEditor({ slot }) {
  const [state, action, pending] = useActionState(updateScheduleAction, {});
  return (
    <form className="schedule-editor" action={action}>
      <input type="hidden" name="meal_slot_id" value={slot.id} />
      <strong>{slot.title}</strong>
      <label>Starts<input type="time" name="starts_at" defaultValue={slot.starts_at.slice(0, 5)} required /></label>
      <label>Ends<input type="time" name="ends_at" defaultValue={slot.ends_at.slice(0, 5)} required /></label>
      <label>Cutoff<input type="time" name="cutoff_at" defaultValue={slot.cutoff_at.slice(0, 5)} required /></label>
      <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save times"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function RoleEditor({ profile, isCurrentUser }) {
  const [state, action, pending] = useActionState(changeRoleAction, {});
  return (
    <form className="role-editor" action={action}>
      <input type="hidden" name="profile_id" value={profile.id} />
      <select name="role" defaultValue={profile.role} aria-label={`Role for ${profile.email}`} disabled={isCurrentUser}>
        <option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option>
      </select>
      <button className="button button-quiet" disabled={pending || isCurrentUser}>{pending ? "Saving…" : "Update role"}</button>
      {isCurrentUser && <span className="field-hint">Your own role cannot be changed here.</span>}
      <Feedback state={state} />
    </form>
  );
}

export function RebateEditor({ students }) {
  const [state, action, pending] = useActionState(createRebateAction, {});
  return (
    <form className="surface-card admin-form" action={action}>
      <label className="field-label">Student<select name="student_id" required defaultValue=""><option value="" disabled>Select a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.full_name} · {student.email}</option>)}</select></label>
      <div className="form-grid">
        <label className="field-label">Amount (INR)<input name="amount" inputMode="decimal" placeholder="0.00" required /></label>
        <label className="field-label">Entry type<select name="kind"><option value="credit">Credit</option><option value="debit">Debit</option></select></label>
      </div>
      <label className="field-label">Reason<input name="reason" minLength={3} maxLength={300} required placeholder="Approved leave, adjustment…" /></label>
      <Feedback state={state} />
      <button className="button button-primary" disabled={pending}>{pending ? "Adding…" : "Add ledger entry"}</button>
    </form>
  );
}

export function AllowanceEditor({ currentValue }) {
  const [state, action, pending] = useActionState(saveAllowanceAction, {});
  return (
    <form className="allowance-form" action={action}>
      <label className="field-label">Monthly meal allowance<input type="number" name="monthly_meal_allowance" min="1" max="300" defaultValue={currentValue} required /></label>
      <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save allowance"}</button>
      <Feedback state={state} />
    </form>
  );
}
