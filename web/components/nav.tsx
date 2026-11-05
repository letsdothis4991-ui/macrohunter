"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Find food" },
  { href: "/check", label: "Check my plate" },
  { href: "/targets", label: "My targets" },
  { href: "/how-it-works", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/venue") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
