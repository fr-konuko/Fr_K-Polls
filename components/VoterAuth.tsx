"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { getVoterClientAuth } from "@/lib/firebase/client";
import type { VoterProfile } from "@/lib/types";

const SYNC_KEY = "jr-voter-auth-update";
interface VoterAuthState {
  user: VoterProfile | null;
  loading: boolean;
  busy: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<VoterProfile | null>;
}
const VoterAuthContext = createContext<VoterAuthState | null>(null);

async function sessionRequest(method: "GET" | "POST" | "DELETE", idToken?: string) {
  const response = await fetch("/api/voter/session", {
    method, cache: "no-store",
    ...(idToken ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) } : {}),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Could not verify your sign-in. Please try again.");
  return (body.user ?? null) as VoterProfile | null;
}

function authMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    const messages: Record<string, string> = {
      "auth/popup-closed-by-user": "Sign-in was cancelled. Choose Continue with Google when you are ready.",
      "auth/cancelled-popup-request": "Another sign-in window was opened. Complete that window or try again.",
      "auth/popup-blocked": "Your browser blocked Google sign-in. Allow pop-ups for this website, then try again.",
      "auth/unauthorized-domain": "Google sign-in is not available on this website address yet. Please contact the team.",
      "auth/operation-not-allowed": "Google sign-in is not enabled yet. Please contact the team.",
      "auth/network-request-failed": "Could not reach Google sign-in. Check your connection and try again.",
      "auth/account-exists-with-different-credential": "This email already has another sign-in method. Contact the team to link your Google account.",
    };
    return messages[error.code] ?? "Google sign-in could not be completed. Please try again.";
  }
  return error instanceof Error ? error.message : "Sign-in could not be completed. Please try again.";
}

function notifyOtherTabs() {
  try { window.localStorage.setItem(SYNC_KEY, crypto.randomUUID()); } catch { /* Sign-in works without local storage. */ }
}

export function VoterAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VoterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++revision.current;
    try {
      const profile = await sessionRequest("GET");
      if (version === revision.current) { setUser(profile); setError(""); }
      return profile;
    } catch (failure) {
      if (version === revision.current) setError(authMessage(failure));
      return null;
    } finally {
      if (version === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    const storage = (event: StorageEvent) => { if (event.key === SYNC_KEY) void refresh(); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);

  async function signIn() {
    setBusy(true); setError("");
    let auth: ReturnType<typeof getVoterClientAuth> | undefined;
    try {
      auth = getVoterClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const profile = await sessionRequest("POST", await result.user.getIdToken(true));
      ++revision.current;
      setUser(profile); setLoading(false);
      notifyOtherTabs();
    } catch (failure) { setError(authMessage(failure)); }
    finally {
      if (auth) await firebaseSignOut(auth).catch(() => {});
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true); setError("");
    try {
      await sessionRequest("DELETE");
      ++revision.current;
      setUser(null); setLoading(false);
      notifyOtherTabs();
    } catch (failure) { setError(authMessage(failure)); }
    finally { setBusy(false); }
  }

  return <VoterAuthContext.Provider value={{ user, loading, busy, error, signIn, signOut, refresh }}>{children}</VoterAuthContext.Provider>;
}

export function useVoterAuth() {
  const context = useContext(VoterAuthContext);
  if (!context) throw new Error("Voter authentication provider is missing.");
  return context;
}
