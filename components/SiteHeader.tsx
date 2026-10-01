"use client";

import Link from "next/link";
import { useEffect } from "react";
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
  useEffect(() => {
    const theme = window.localStorage.getItem("frk-polls-theme");
    if (theme === "dark") document.documentElement.dataset.theme = "dark";
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    window.localStorage.setItem("frk-polls-theme", isDark ? "dark" : "light");
  }

  const links = [
    { href: "/", label: "Home" },
    { href: "/vote", label: "Vote" },
    { href: "/results", label: "Results" },
    { href: "/contact", label: "Contact" },
  ];
  const isPublicationsActive = pathname.startsWith("/blog") || pathname.startsWith("/reports");

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
        <details className={isPublicationsActive ? "publications-menu is-active" : "publications-menu"}>
          <summary aria-current={isPublicationsActive ? "page" : undefined}>Publications</summary>
          <div className="publications-dropdown">
            <Link className={pathname.startsWith("/blog") ? "is-current" : undefined} href="/blog" aria-current={pathname.startsWith("/blog") ? "page" : undefined}>
              Blogs
            </Link>
            <Link className={pathname.startsWith("/reports") ? "is-current" : undefined} href="/reports" aria-current={pathname.startsWith("/reports") ? "page" : undefined}>
              Reports
            </Link>
          </div>
        </details>
      </nav>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle color theme" title="Toggle color theme">
        <svg className="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}
