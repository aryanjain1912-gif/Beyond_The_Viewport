import Link from "next/link";
import PasswordResetForm from "../components/PasswordResetForm";
import BrandEmblem from "../components/BrandEmblem";
import AuthStory from "../components/AuthStory";

export const metadata = { title: "Reset password · Mystic Sanctum" };

export default function ForgotPassword() {
  return (
    <main className="auth-page">
      <div className="auth-landscape" />
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <AuthStory />
      <section className="auth-card">
        <p className="section-kicker">ACCOUNT RECOVERY</p>
        <h1>Reset your password.</h1>
        <p className="auth-intro">We&apos;ll send a secure reset link if the address belongs to an account.</p>
        <PasswordResetForm mode="request" />
      </section>
    </main>
  );
}
