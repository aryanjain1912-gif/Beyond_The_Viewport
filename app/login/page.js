import Link from "next/link";
import AuthForm from "../components/AuthForm";
import BrandEmblem from "../components/BrandEmblem";
import AuthStory from "../components/AuthStory";

export const metadata = { title: "Sign in · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const notice = params?.error === "confirmation"
    ? "That email confirmation or reset link is invalid or expired. Request a fresh link and try again."
    : params?.error === "setup"
      ? "Supabase is not configured yet. Add the project settings to .env.local."
      : null;

  return (
    <main className="auth-page">
      <div className="auth-landscape" />
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <AuthStory />
      <section className="auth-card">
        <p className="section-kicker">THE KAMAR-TAJ REFECTORY</p>
        <h1>Welcome back.</h1>
        <p className="auth-intro">Sign in to manage your meals and meal pass.</p>
        {notice && <p className="form-feedback error" role="alert">{notice}</p>}
        <AuthForm mode="login" />
        <p className="auth-note">Accounts and meal information are managed by the refectory system.</p>
      </section>
    </main>
  );
}
