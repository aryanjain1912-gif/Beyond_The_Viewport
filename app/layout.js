import "./globals.css";
import OfflineSupport from "./components/OfflineSupport";

export const metadata = {
  title: "Mystic Sanctum — The Kamar-Taj Refectory",
  description: "A student meal dashboard for the Kamar-Taj Refectory.",
  icons: {
    icon: "/sanctum-emblem.svg",
    shortcut: "/sanctum-emblem.svg",
    apple: "/sanctum-emblem.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <OfflineSupport />
      </body>
    </html>
  );
}
