import Link from "next/link";
import AuthForm from "../components/AuthForm";
import BrandEmblem from "../components/BrandEmblem";
import AuthStory from "../components/AuthStory";

export const metadata = { title: "Student sign up · Mystic Sanctum" };

export default function SignupPage() {
  return (
    <main className="auth-page">
      <div className="auth-landscape" />
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <AuthStory />
      <section className="auth-card">
        <p className="section-kicker">A PLACE AT THE TABLE</p>
        <h1>Join the refectory.</h1>
        <p className="auth-intro">Create a student account to browse menus and reserve meals.</p>
        <AuthForm mode="signup" />
        <p className="auth-note">New registrations are student accounts. An administrator assigns staff and admin roles.</p>
      </section>
    </main>
  );
}
