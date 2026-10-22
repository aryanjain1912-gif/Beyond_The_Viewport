import Link from "next/link";

// The three portals people can enter. Add or edit roles here.
const roles = [
  {
    key: "student",
    title: "Student",
    icon: "✦",
    text: "Book meals, track the cutoff countdown and show your QR pass.",
  },
  {
    key: "staff",
    title: "Mess Staff",
    icon: "❂",
    text: "Scan QR passes and verify meals at the refectory counter.",
  },
  {
    key: "admin",
    title: "Administrator",
    icon: "✧",
    text: "Manage menus, schedules, bookings and daily reports.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Soft glowing circle behind the title */}
      <div className="pointer-events-none absolute top-24 h-72 w-72 rounded-full bg-[#ff8a3d]/20 blur-3xl sm:h-96 sm:w-96" />

      <header className="relative z-10 text-center">
        <p className="mb-4 text-sm tracking-[0.4em] text-[#d4a84b]">
          THE KAMAR-TAJ REFECTORY
        </p>
        <h1 className="font-serif text-5xl font-bold text-[#f3ead3] sm:text-7xl">
          Mystic Sanctum
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-[#f3ead3]/70 sm:text-lg">
          Daily sustenance, scheduled with precision. Book your meal, pass the
          portal, and leave no food to waste.
        </p>
      </header>

      <section className="relative z-10 mt-14 grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={`/login?role=${role.key}`}
            className="group rounded-2xl border border-[#d4a84b]/30 bg-white/5 p-6 text-center backdrop-blur transition hover:-translate-y-1 hover:border-[#d4a84b] hover:shadow-[0_0_30px_rgba(255,138,61,0.25)]"
          >
            <div className="text-4xl text-[#d4a84b] transition group-hover:text-[#ff8a3d]">
              {role.icon}
            </div>
            <h2 className="mt-4 font-serif text-2xl text-[#f3ead3]">
              {role.title}
            </h2>
            <p className="mt-2 text-sm text-[#f3ead3]/60">{role.text}</p>
            <span className="mt-5 inline-block text-sm font-medium text-[#d4a84b]">
              Enter portal →
            </span>
          </Link>
        ))}
      </section>

      <footer className="relative z-10 mt-16 text-xs text-[#f3ead3]/40">
        Team Beyond The Viewport · Webster 2026 · MNNIT Allahabad
      </footer>
    </main>
  );
}
