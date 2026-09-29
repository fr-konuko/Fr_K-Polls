"use client";

import { FormEvent, useState } from "react";
import { FirebaseError } from "firebase/app";
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
    } catch (error) {
      if (error instanceof FirebaseError && error.code.startsWith("auth/")) {
        const messages: Record<string, string> = {
          "auth/invalid-credential": "Firebase did not accept that email and password. Check the account credentials.",
          "auth/too-many-requests": "Too many sign-in attempts. Wait a while before trying again.",
          "auth/network-request-failed": "Could not reach Firebase Authentication. Check your connection.",
        };
        setMessage(messages[error.code] ?? `Firebase sign-in failed (${error.code}).`);
      } else if (error instanceof Error && error.message === "Unexpected server error.") {
        setMessage("The sign-in server could not create your session. Check Firebase Admin credentials or server logs.");
      } else if (error instanceof Error && error.message === "This account is not an administrator.") {
        setMessage(error.message);
      } else {
        setMessage("Sign-in failed. Check your email and password, then try again.");
      }
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
