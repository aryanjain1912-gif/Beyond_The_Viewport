import Link from "next/link";
import { redirect } from "next/navigation";
import AuthForm from "./components/AuthForm";
import AuthStory from "./components/AuthStory";
import BrandEmblem from "./components/BrandEmblem";
import { getCurrentProfile, roleHome } from "../lib/auth";
import { getSupabaseConfig } from "../lib/supabase/config";

export const metadata = {
  title: "Mystic Sanctum — The Kamar-Taj Refectory",
  description: "A meal booking and refectory management system.",
};
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabaseConfig = getSupabaseConfig();

  if (supabaseConfig) {
    const profile = await getCurrentProfile();
    if (profile) redirect(roleHome(profile.role));
  }

  return (
    <main className="auth-page">
      <div className="auth-landscape" />
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <AuthStory />
      <section className="auth-card">
        <p className="section-kicker">THE KAMAR-TAJ REFECTORY</p>
        <h1>Welcome back.</h1>
        <p className="auth-intro">Sign in to manage your meals and meal pass.</p>
        <AuthForm mode="login" />
        {!supabaseConfig && (
          <div className="setup-alert" role="status">
            <strong>Supabase setup required</strong>
            <p>Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase project values, and run the migration in <code>supabase/migrations</code>.</p>
          </div>
        )}
      </section>
      <footer className="auth-credit">Designed by Team Beyond The Viewport</footer>
    </main>
  );
}
