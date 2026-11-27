"use client";

import { FormEvent, useRef, useState } from "react";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { StatusMessage } from "@/components/StatusMessage";
import { getClientAuth } from "@/lib/firebase/client";

export function AdminLogin() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"google" | "password" | "reset" | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await signIn("password", new FormData(event.currentTarget));
  }

  async function signIn(method: "google" | "password", form?: FormData) {
    if (busy) return;
    setBusy(method);
    setMessage("");
    setSuccess(false);
    let auth: Auth | undefined;
    try {
      auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = method === "google"
        ? await signInWithPopup(auth, provider)
        : await signInWithEmailAndPassword(auth, String(form?.get("email")), String(form?.get("password")));
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Sign-in failed.");
      await signOut(auth);
      auth = undefined;
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      if (error instanceof FirebaseError && error.code.startsWith("auth/")) {
        const messages: Record<string, string> = {
          "auth/invalid-credential": "Email and password were not accepted. If you use Google for this account, choose Continue with Google.",
          "auth/popup-closed-by-user": "Sign-in was cancelled. Choose Continue with Google to try again.",
          "auth/cancelled-popup-request": "Sign-in was cancelled. Please try again.",
          "auth/popup-blocked": "Allow pop-ups for this website, then try Google sign-in again.",
          "auth/unauthorized-domain": "Google sign-in is not enabled for this website address. Please contact the team.",
          "auth/too-many-requests": "Too many sign-in attempts. Wait a while before trying again.",
          "auth/network-request-failed": "Could not reach Firebase Authentication. Check your connection.",
        };
        setMessage(messages[error.code] ?? `Firebase sign-in failed (${error.code}).`);
      } else if (error instanceof Error && error.message === "Unexpected server error.") {
        setMessage("The sign-in server could not create your session. Check Firebase Admin credentials or server logs.");
      } else if (error instanceof Error && error.message === "This account is not an administrator.") {
        setMessage(error.message);
      } else {
        setMessage("Sign-in failed. Please try again.");
      }
    } finally {
      if (auth) await signOut(auth).catch(() => {});
      setBusy(null);
    }
  }

  async function resetPassword() {
    if (busy) return;
    const email = formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
    if (!email?.reportValidity()) return;
    setBusy("reset");
    setMessage("");
    setSuccess(false);
    try {
      await sendPasswordResetEmail(getClientAuth(), email.value.trim(), { url: `${window.location.origin}/admin-login` });
      setSuccess(true);
      setMessage("If this email has an account, a password setup/reset link has been sent. Check your inbox and spam folder. Setting a password does not grant administrator access.");
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "auth/user-not-found") {
        setSuccess(true);
        setMessage("If this email has an account, a password setup/reset link has been sent. Check your inbox and spam folder. Setting a password does not grant administrator access.");
      } else {
        setMessage("Could not send the password link. Check your connection and email address, then try again.");
      }
    } finally { setBusy(null); }
  }

  return (
    <form ref={formRef} className="card stack" onSubmit={submit} aria-busy={Boolean(busy)}>
      <button className="google-sign-in" type="button" disabled={Boolean(busy)} onClick={() => signIn("google")}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285f4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34a853" d="M24 44c5.5 0 10.2-1.8 13.5-4.9l-6.6-5.1a12.3 12.3 0 0 1-18.4-6.5H5.7v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#fbbc05" d="M12.5 27.5a12.2 12.2 0 0 1 0-7V15H5.7a20.4 20.4 0 0 0 0 18l6.8-5.5Z"/><path fill="#ea4335" d="M24 12c3.2 0 6.1 1.1 8.4 3.3l6.2-6.2A20.3 20.3 0 0 0 5.7 15l6.8 5.5A12.2 12.2 0 0 1 24 12Z"/></svg>
        {busy === "google" ? "Signing in…" : "Continue with Google"}
      </button>
      <p className="login-note">Or use your administrator email and password.</p>
      <label htmlFor="admin-email">
        Email address
        <input id="admin-email" name="email" type="email" autoComplete="username" required />
      </label>
      <div>
        <label htmlFor="admin-password">Password</label>
        <div className="password-field">
        <input
          id="admin-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
        />
        <button type="button" aria-controls="admin-password" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button>
        </div>
      </div>
      <button className="button-primary" disabled={Boolean(busy)} type="submit">{busy === "password" ? "Signing in…" : "Sign in to workspace"}</button>
      <button type="button" className="text-link" disabled={Boolean(busy)} onClick={resetPassword}>{busy === "reset" ? "Sending password link…" : "Set or reset your password"}</button>
      <StatusMessage message={message} tone={success ? "success" : "error"} />
    </form>
  );
}
