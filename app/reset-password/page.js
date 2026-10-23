import Link from "next/link";
import PasswordResetForm from "../components/PasswordResetForm";
import BrandEmblem from "../components/BrandEmblem";
import AuthStory from "../components/AuthStory";

export const metadata = { title: "Choose a new password · Mystic Sanctum" };
export const dynamic = "force-dynamic";

export default function ResetPassword() {
  return (
    <main className="auth-page">
      <div className="auth-landscape" />
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <AuthStory />
      <section className="auth-card">
        <p className="section-kicker">ACCOUNT RECOVERY</p>
        <h1>Choose a new password.</h1>
        <p className="auth-intro">Use at least 8 characters. Your reset link must be valid and unused.</p>
        <PasswordResetForm mode="update" />
      </section>
    </main>
  );
}
