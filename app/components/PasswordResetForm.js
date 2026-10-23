"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, updatePasswordAction } from "../actions/auth";

export default function PasswordResetForm({ mode }) {
  const isUpdate = mode === "update";
  const action = isUpdate ? updatePasswordAction : requestPasswordResetAction;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form className="auth-form" action={formAction}>
      {isUpdate ? (
        <label>New password<input autoComplete="new-password" name="password" type="password" minLength={8} required /></label>
      ) : (
        <label>Email address<input autoComplete="email" name="email" type="email" required /></label>
      )}
      {state.error && <p className="form-feedback error" role="alert">{state.error}</p>}
      {state.success && <p className="form-feedback success" role="status">{state.success}</p>}
      <button className="button button-primary" disabled={pending}>{pending ? "Please wait…" : isUpdate ? "Save new password" : "Send reset link"}</button>
      <p className="auth-switch"><Link href="/login">Return to sign in</Link></p>
    </form>
  );
}
