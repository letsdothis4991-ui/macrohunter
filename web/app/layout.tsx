import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";

import { Nav } from "~/components/nav";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["SOFT", "opsz"] });

export const metadata: Metadata = {
  title: { default: "MacroHunter", template: "%s · MacroHunter" },
  description: "Find food near you in Sydney that fits your protein, carbs, fat and calorie targets.",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdf8" },
    { media: "(prefers-color-scheme: dark)", color: "#18221c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <header className="header">
          <div className="container header-inner">
            <Link href="/" className="brand" aria-label="MacroHunter home">
              <span className="brand-dot" aria-hidden />
              MacroHunter
            </Link>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="footer container">
          Estimates, not lab results. Ratings from Google. Map ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
