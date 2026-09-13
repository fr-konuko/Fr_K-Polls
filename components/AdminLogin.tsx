"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { StatusMessage } from "@/components/StatusMessage";
import { getClientAuth } from "@/lib/firebase/client";

export function AdminLogin() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const auth = getClientAuth();
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        String(form.get("email")),
        String(form.get("password")),
      );
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Sign-in failed.");
      await signOut(auth);
      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Sign-in failed or this account is not an administrator.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <label htmlFor="admin-email">
        Email
        <input id="admin-email" name="email" type="email" autoComplete="username" required />
      </label>
      <label htmlFor="admin-password">
        Password
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <button disabled={busy} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
      <StatusMessage message={message} />
    </form>
  );
}
