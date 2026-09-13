"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/vote", label: "Vote" },
    { href: "/results", label: "Results" },
  ];

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Logo />
        <span className="brand-type">
          <strong>Frk</strong>
          <span>Polls</span>
        </span>
      </Link>
      <nav aria-label="Primary navigation">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              className={active ? "nav-link is-active" : "nav-link"}
              href={link.href}
              aria-current={active ? "page" : undefined}
              key={link.href}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
