import Link from "next/link";
import MealScanner from "../components/MealScanner";
import BrandEmblem from "../components/BrandEmblem";

export const metadata = { title: "Offline scanner · Mystic Sanctum" };

export default function OfflineScanPage() {
  return (
    <main className="offline-page">
      <Link className="auth-brand" href="/"><BrandEmblem /><span>Mystic Sanctum</span></Link>
      <div className="offline-page-heading">
        <p className="section-kicker">REFECTORY SCANNER</p>
        <h1>Connection interrupted.</h1>
        <p>This scanner page is designed to be opened once while online so its app shell is available offline.</p>
      </div>
      <MealScanner offlineOnly />
      <Link className="button button-quiet" href="/login">Back to sign in to synchronize</Link>
    </main>
  );
}
