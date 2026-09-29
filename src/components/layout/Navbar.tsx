"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Explicitly public navigation - NO ADMIN LINK
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Services", href: "/#services" },
    { name: "Sectors", href: "/#sectors" },
    { name: "Results", href: "/results" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link href="/" className="brand" aria-label="JOPA Research Africa Home">
          <span className="logo-mark logo-bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>JOPA Research Africa</span>
        </Link>

        <button
          type="button"
          className="mobile-toggle"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            {mobileOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <nav className="nav-links" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href) && !link.href.includes("#");
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                {link.name}
              </Link>
            );
          })}
          <Link href="/vote" className="nav-cta">
            Vote now &rarr;
          </Link>
        </nav>
      </div>

      {mobileOpen && (
        <div className="mobile-drawer open">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="nav-link"
              onClick={() => setMobileOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/vote"
            className="btn orange"
            style={{ textAlign: "center", marginTop: "8px" }}
            onClick={() => setMobileOpen(false)}
          >
            Vote now &rarr;
          </Link>
        </div>
      )}
    </header>
  );
}
