"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { VoterAccount } from "@/components/VoterAccount";

export function SiteHeader() {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const resources = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    try {
      const theme = window.localStorage.getItem("frk-polls-theme");
      if (theme === "dark") document.documentElement.dataset.theme = "dark";
    } catch { /* Use the default theme if storage is unavailable. */ }
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    try { window.localStorage.setItem("frk-polls-theme", isDark ? "dark" : "light"); } catch { /* Theme still works for this visit. */ }
  }

  function closeNavigation() {
    setIsMobileNavOpen(false);
    if (resources.current) resources.current.open = false;
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="JR Africa home" onClick={closeNavigation}><BrandLogo preload /></Link>
        <nav className={isMobileNavOpen ? "site-nav is-open" : "site-nav"} id="primary-navigation" aria-label="Primary navigation">
          {[{ href: "/", label: "Home" }, { href: "/vote", label: "Vote" }, { href: "/results", label: "Results" }, { href: "/reports", label: "Reports" }].map((link) => {
            const active = pathname === link.href;
            return <Link className={active ? "nav-link is-active" : "nav-link"} href={link.href} aria-current={active ? "page" : undefined} key={link.href} onClick={closeNavigation}>{link.label}</Link>;
          })}
          <details className="nav-resources" ref={resources} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
            <summary className={["/blog", "/services"].includes(pathname) ? "nav-link is-active" : "nav-link"}>Resources <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg></summary>
            <div className="nav-dropdown"><Link href="/blog" onClick={closeNavigation}>Polling guide</Link><Link href="/services" onClick={closeNavigation}>Platform & services</Link></div>
          </details>
          <Link className={pathname === "/contact" ? "nav-link contact-cta is-active" : "nav-link contact-cta"} href="/contact" onClick={closeNavigation}>Let’s talk <span aria-hidden="true">↗</span></Link>
        </nav>
        <div className="header-tools">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Switch between light and dark theme" title="Switch theme">
            <svg className="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.5 8.5 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <svg className="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v2m0 16v2M5 5l1.5 1.5m11 11L19 19M2 12h2m16 0h2M5 19l1.5-1.5m11-11L19 5" stroke="currentColor" strokeWidth="1.7" /></svg>
          </button>
          <VoterAccount />
          <button className="mobile-menu-toggle" type="button" aria-label={isMobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={isMobileNavOpen} aria-controls="primary-navigation" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={isMobileNavOpen ? "m6 6 12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>
    </header>
  );
}
