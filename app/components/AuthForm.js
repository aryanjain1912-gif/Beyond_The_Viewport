"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction } from "../actions/auth";

export default function AuthForm({ mode }) {
  const isSignUp = mode === "signup";
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form className="auth-form" action={formAction}>
      {isSignUp && (
        <label>
          Your name
          <input autoComplete="name" name="full_name" minLength={2} maxLength={80} required />
        </label>
      )}
      <label>
        Email address
        <input autoComplete="email" name="email" type="email" required />
      </label>
      <label>
        Password
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          name="password"
          type="password"
          minLength={isSignUp ? 8 : undefined}
          required
        />
        {isSignUp && <span className="field-hint">Use at least 8 characters.</span>}
      </label>
      {state.error && <p className="form-feedback error" role="alert">{state.error}</p>}
      {state.success && <p className="form-feedback success" role="status">{state.success}</p>}
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : isSignUp ? "Create student account" : "Sign in"}
      </button>
      {!isSignUp && <Link className="auth-forgot" href="/forgot-password">Forgot your password?</Link>}
      <p className="auth-switch">
        {isSignUp ? "Already registered?" : "New to the refectory?"}{" "}
        <Link href={isSignUp ? "/login" : "/signup"}>
          {isSignUp ? "Sign in" : "Create a student account"}
        </Link>
      </p>
    </form>
  );
}
