import type { Metadata } from "next";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata: Metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="shell page narrow">
      <header className="page-heading">
        <div>
          <span className="eyebrow eyebrow-blue">Restricted</span>
          <h1>Staff sign-in</h1>
          <p>Use an approved Firebase administrator account.</p>
        </div>
      </header>
      <AdminLogin />
    </main>
  );
}
