import type { Metadata } from "next";
import { AdminLogin } from "@/components/AdminLogin";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";
import "./admin-login.css";

export const metadata: Metadata = { title: "Administrator sign-in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main id="main-content" className="shell page admin-login-page">
      <Link className="admin-login-back" href="/">
        <span aria-hidden="true">←</span> Back to website
      </Link>
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <header className="admin-login-heading">
          <div className="admin-login-brand"><BrandLogo /></div>
          <p className="eyebrow">Administrator workspace</p>
          <h1 id="admin-login-title">Welcome back</h1>
          <p>Sign in to manage your polls and results.</p>
        </header>
        <AdminLogin />
        <footer className="admin-login-access">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>
          <p>For approved administrators only.<br />Administrator accounts cannot vote.</p>
        </footer>
      </section>
      <p className="admin-login-help">Need access to the workspace? <Link href="/contact">Contact the team</Link></p>
    </main>
  );
}
