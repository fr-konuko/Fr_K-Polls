"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Poll } from "@/lib/types";

export function OpenPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/polls").then(async (response) => {
      if (!response.ok) throw new Error("Polls unavailable");
      const data = await response.json() as { polls: Poll[] };
      if (active) setPolls(data.polls);
    }).catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="open-polls" aria-labelledby="open-polls-title" aria-busy={loading}>
      <div className="panel-heading"><h2 id="open-polls-title">Open for voting</h2><span className="status-badge status-active">Open polls</span></div>
      {loading ? <p className="panel-message" role="status">Loading open polls…</p>
        : error ? <p className="panel-message">Polls could not be loaded. <Link href="/vote">Go to the voting page</Link> to try again.</p>
        : !polls.length ? <p className="panel-message">There are no open polls at the moment. Published results are still available below.</p>
        : <div className="open-poll-list">{polls.slice(0, 3).map((poll) => (
          <article className="open-poll" key={poll.id}>
            <span className="eyebrow">{poll.position || "Opinion poll"}</span>
            <h3><Link href={"/vote?poll=" + encodeURIComponent(poll.id)}>{poll.name}</Link></h3>
            {poll.description && <p>{poll.description}</p>}
            <div className="open-poll-actions">
              <Link className="button button-primary" href={"/vote?poll=" + encodeURIComponent(poll.id)}>Vote in this poll</Link>
              <Link className="text-link" href={"/results?poll=" + encodeURIComponent(poll.id)}>View results</Link>
            </div>
          </article>
        ))}</div>}
      <div className="panel-footer"><Link href="/vote">Browse all open polls</Link><Link href="/results">Published results</Link></div>
    </section>
  );
}
