"use client";

import Link from "next/link";
import { useState } from "react";
import { useVoterAuth } from "@/components/VoterAuth";

function VoterAvatar({ name, photoURL }: { name: string; photoURL?: string }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  if (photoURL && failedPhoto !== photoURL) {
    // Google serves this account image directly; avoid proxying personal avatars.
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="account-avatar account-avatar-photo" src={photoURL} width={32} height={32} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(photoURL)} />;
  }
  return <span className="account-avatar" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || "V"}</span>;
}

export function VoterAccount() {
  const { user, loading, busy, error, signOut } = useVoterAuth();
  if (loading) return <span className="account-loading" role="status">Checking sign-in…</span>;
  if (!user) return <Link className="button button-secondary voter-sign-in" href="/login">Sign in</Link>;
  return (
    <details className="voter-account" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
      <summary aria-label={`Voter account: ${user.name}`}><VoterAvatar name={user.name} photoURL={user.photoURL} /></summary>
      <div className="account-dropdown">
        <strong>{user.name}</strong><span>{user.email}</span>
        <p>Signed in to vote</p>
        <button type="button" className="button-secondary" disabled={busy} onClick={() => signOut()}>{busy ? "Signing out…" : "Sign out"}</button>
        {error && <p className="account-error" role="alert">{error}</p>}
      </div>
    </details>
  );
}
