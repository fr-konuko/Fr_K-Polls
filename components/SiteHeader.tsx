"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [openMenu, setOpenMenu] = useState<"polls" | "publications" | null>(null);
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
  ];
  const menus = [
    {
      id: "polls",
      label: "Polls",
      active: pathname.startsWith("/vote") || pathname.startsWith("/results"),
      links: [
        { href: "/vote", label: "Vote" },
        { href: "/results", label: "Results" },
      ],
    },
    {
      id: "publications",
      label: "Publications",
      active: pathname.startsWith("/blog") || pathname.startsWith("/reports"),
      links: [
        { href: "/blog", label: "Blogs" },
        { href: "/reports", label: "Reports" },
      ],
    },
  ] as const;

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
        {menus.map((menu) => {
          const isOpen = openMenu === menu.id;
          return (
            <div
              className={menu.active ? "nav-menu is-active" : "nav-menu"}
              key={menu.id}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setOpenMenu(menu.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") {
                  setOpenMenu((current) => current === menu.id ? null : current);
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOpenMenu((current) => current === menu.id ? null : current);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpenMenu(null);
              }}
            >
              <button
                className="nav-menu-trigger"
                type="button"
                aria-expanded={isOpen}
                aria-controls={`nav-${menu.id}-dropdown`}
                aria-current={menu.active ? "page" : undefined}
                onFocus={() => setOpenMenu(menu.id)}
                onClick={() => {
                  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
                  setOpenMenu(supportsHover ? menu.id : (current) => current === menu.id ? null : menu.id);
                }}
              >
                {menu.label}
              </button>
              <div className="nav-dropdown" id={`nav-${menu.id}-dropdown`} hidden={!isOpen}>
                {menu.links.map((link) => {
                  const active = pathname.startsWith(link.href);
                  return (
                    <Link
                      className={active ? "is-current" : undefined}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      key={link.href}
                      onClick={() => setOpenMenu(null)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        <Link
          className={pathname.startsWith("/contact") ? "nav-link is-active" : "nav-link"}
          href="/contact"
          aria-current={pathname.startsWith("/contact") ? "page" : undefined}
        >
          Contact
        </Link>
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
