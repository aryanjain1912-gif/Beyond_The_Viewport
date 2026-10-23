import BrandEmblem from "./BrandEmblem";

export default function AuthStory() {
  return (
    <aside className="auth-story" aria-label="The Kamar-Taj Refectory">
      <BrandEmblem className="auth-story-emblem" />
      <p className="auth-story-kicker">THE KAMAR-TAJ</p>
      <h1>REFECTORY</h1>
      <div className="auth-story-values">
        <span>GOOD FOOD</span>
        <i />
        <span>HEALTHY MINDS</span>
        <i />
        <span>STRONGER COMMUNITY</span>
      </div>
    </aside>
  );
}
