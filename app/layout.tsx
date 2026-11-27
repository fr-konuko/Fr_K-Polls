import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { VoterAuthProvider } from "@/components/VoterAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JR Africa", template: "%s | JR Africa" },
  description: "Take part in community opinion polls, follow published results, and explore poll reports.",
  icons: {
    icon: { url: "/jr-africa-icon.svg?v=2", type: "image/svg+xml" },
    shortcut: "/jr-africa-icon.svg?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VoterAuthProvider>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div className="footer-brand">
              <Link className="brand footer-logo" href="/" aria-label="JR Africa home"><BrandLogo /></Link>
              <span>Community opinion, published results, and a clearer view of the conversation.</span>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/vote">Vote</Link>
              <Link href="/results">Results</Link>
              <Link href="/reports">Reports</Link>
              <Link href="/blog">Polling guide</Link>
              <Link href="/services">Platform</Link>
              <Link className="button contact-cta" href="/contact">Let’s talk <span aria-hidden="true">↗</span></Link>
            </nav>
          </div>
          <div className="shell"><div className="footer-bottom"><span>© {new Date().getFullYear()} JR Africa</span><span>Voluntary opinion polling · Not official election results</span></div></div>
        </footer>
        </VoterAuthProvider>
      </body>
    </html>
  );
}
