import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { VoterLogin } from "@/components/VoterLogin";

export const metadata: Metadata = { title: "Sign in to vote", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main id="main-content" className="shell page login-page">
      <section className="login-panel">
        <div className="login-brand"><BrandLogo /></div>
        <p className="eyebrow">Voter account</p><h1>Sign in to vote</h1>
        <Suspense fallback={<p role="status">Loading sign-in…</p>}><VoterLogin /></Suspense>
      </section>
    </main>
  );
}
