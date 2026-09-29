"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("Please enter the administrator passcode.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      router.push("/portal");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: "20px" }}>
      <div className="card" style={{ width: "min(460px, 100%)", padding: "36px", boxShadow: "var(--shadow-lg)" }}>
        <span className="section-kicker">Restricted Access</span>
        <h1 style={{ fontSize: "1.8rem", margin: "8px 0 12px" }}>Portal Sign-In</h1>
        <p className="small" style={{ marginBottom: "24px" }}>
          This portal is reserved for authorized JOPA Research Africa operations.
        </p>

        {error && (
          <div className="status bad" role="alert" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label htmlFor="pPass">Administrator Passcode</label>
          <div style={{ position: "relative" }}>
            <input
              id="pPass"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              style={{ paddingRight: "48px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide passcode" : "Show passcode"}
              style={{
                position: "absolute",
                right: "8px",
                top: "14px",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "1.1rem",
                padding: "4px 8px",
              }}
            >
              {showPassword ? "\u25CE" : "\u25C9"}
            </button>
          </div>

          <button
            type="submit"
            className="btn orange"
            disabled={loading}
            style={{ width: "100%", marginTop: "8px" }}
          >
            {loading ? "Authenticating..." : "Access Control Center \u2192"}
          </button>
        </form>
      </div>
    </div>
  );
}
