import type { Metadata } from "next";
import { AdminLogin } from "@/components/AdminLogin";
import { BrandLogo } from "@/components/BrandLogo";
import Link from "next/link";

export const metadata: Metadata = { title: "Administrator sign-in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main id="main-content" className="shell page login-page">
      <section className="login-panel">
        <div className="login-brand"><BrandLogo /></div>
        <p className="eyebrow">JR Africa workspace</p>
        <h1>Administrator sign-in</h1>
        <p className="login-description">Manage your polls, candidates, and publication settings.</p>
        <AdminLogin />
        <p className="login-note">Access is limited to approved administrators. For help accessing your account, <Link href="/contact">contact the team</Link>.</p>
      </section>
      <Link className="login-back" href="/">Back to the public website</Link>
    </main>
  );
}
