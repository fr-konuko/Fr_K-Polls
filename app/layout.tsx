import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Frk Polls", template: "%s | Frk Polls" },
  description: "Secure polling, transparent results, and data-driven insights.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f4f0",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <strong>Frk Polls</strong>
              <span>Clear questions. Useful signal.</span>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/vote">Vote</Link>
              <Link href="/results">Results</Link>
            </nav>
            <small>© {new Date().getFullYear()} Frk Polls</small>
          </div>
        </footer>
      </body>
    </html>
  );
}
