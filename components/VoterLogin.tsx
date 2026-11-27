"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useVoterAuth } from "@/components/VoterAuth";
import { StatusMessage } from "@/components/StatusMessage";

export function VoterLogin() {
  const { user, loading, busy, error, signIn } = useVoterAuth();
  const params = useSearchParams();
  const router = useRouter();
  const poll = params.get("poll")?.slice(0, 128);
  const candidate = params.get("candidate")?.slice(0, 128);
  const query = new URLSearchParams();
  if (poll) query.set("poll", poll);
  if (poll && candidate) query.set("candidate", candidate);
  const destination = "/vote" + (query.size ? `?${query}` : "");
  const back = poll ? `/vote?poll=${encodeURIComponent(poll)}` : "/vote";

  useEffect(() => { if (user && !busy) router.replace(destination); }, [user, busy, router, destination]);

  return (
    <div className="stack">
      <p className="login-description">Use your Google account to submit a vote. You can browse polls and results without signing in.</p>
      <button type="button" className="google-sign-in" disabled={loading || busy || Boolean(user)} onClick={() => signIn()}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285f4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34a853" d="M24 44c5.5 0 10.2-1.8 13.5-4.9l-6.6-5.1a12.3 12.3 0 0 1-18.4-6.5H5.7v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#fbbc05" d="M12.5 27.5a12.2 12.2 0 0 1 0-7V15H5.7a20.4 20.4 0 0 0 0 18l6.8-5.5Z"/><path fill="#ea4335" d="M24 12c3.2 0 6.1 1.1 8.4 3.3l6.2-6.2A20.3 20.3 0 0 0 5.7 15l6.8 5.5A12.2 12.2 0 0 1 24 12Z"/></svg>
        {busy ? "Completing sign-in…" : loading ? "Checking sign-in…" : user ? "Returning to your poll…" : "Continue with Google"}
      </button>
      <StatusMessage message={error} />
      <p className="login-note">One vote per eligible Google account for each position in a poll. Administrator accounts cannot vote. Your name and email are not shown in public results. After signing in, review your selection before confirming.</p>
      <Link className="text-link" href={back}>Back to the poll</Link>
    </div>
  );
}
