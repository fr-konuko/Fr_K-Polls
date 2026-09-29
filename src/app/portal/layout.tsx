"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch("/api/portal/logout", { method: "POST" });
      router.push("/portal/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  // If on login page, render children cleanly without admin shell header
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/portal" className="brand" style={{ color: "#ffffff" }}>
            <span className="logo-mark logo-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>JOPA Admin Center</span>
          </Link>
          <span className="admin-badge">Internal Operations</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn danger"
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
        >
          Sign Out
        </button>
      </header>

      <div className="wrap" style={{ padding: "30px 0 60px", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
