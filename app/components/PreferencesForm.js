"use client";

import { useActionState } from "react";
import { savePreferencesAction } from "../actions/student";

const options = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["no_onion_garlic", "No onion or garlic"],
  ["no_dairy", "Dairy-free"],
  ["no_gluten", "Gluten-free"],
  ["no_nuts", "Nut allergy"],
  ["jain", "Jain"],
];

export default function PreferencesForm({ savedPreferences = [], notes = "" }) {
  const [state, action, pending] = useActionState(savePreferencesAction, {});

  return (
    <form className="surface-card preferences-form" action={action}>
      <div className="preferences-grid">
        {options.map(([value, label]) => (
          <label className="preference-option" key={value}>
            <input type="checkbox" name="preferences" value={value} defaultChecked={savedPreferences.includes(value)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className="field-label" htmlFor="dietary-notes">Additional notes for the kitchen</label>
      <textarea id="dietary-notes" name="notes" maxLength={500} rows={4} defaultValue={notes} placeholder="Share anything else the kitchen should know." />
      <p className="field-hint">Allergy notes are shared with refectory administrators. Contact the kitchen directly for urgent allergy needs.</p>
      {state.error && <p className="form-feedback error" role="alert">{state.error}</p>}
      {state.success && <p className="form-feedback success" role="status">{state.success}</p>}
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</button>
    </form>
  );
}
