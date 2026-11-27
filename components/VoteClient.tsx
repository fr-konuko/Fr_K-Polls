"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVoterAuth } from "@/components/VoterAuth";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { PollVoteLink } from "@/components/PollVoteLink";
import { CheckIcon } from "@/components/Icons";
import { StatusMessage } from "@/components/StatusMessage";
import type { Aspirant, Poll, PollResults } from "@/lib/types";

class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

interface VoteStatus { votedPositions: string[]; votedAspirants: Record<string, string> }

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new RequestError(body.error ?? "Request failed.", response.status);
  return body as T;
}

export function VoteClient() {
  const { user, loading: authLoading, busy: authBusy, refresh } = useVoterAuth();
  const uid = user?.uid;
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollId, setPollId] = useState("");
  const [data, setData] = useState<PollResults | null>(null);
  const [votedPositions, setVotedPositions] = useState<string[]>([]);
  const [votedAspirants, setVotedAspirants] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success" | "info">("info");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingCandidate, setPendingCandidate] = useState<Aspirant | null>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const requestGeneration = useRef(0);
  const [statusIdentity, setStatusIdentity] = useState<string | null>(null);
  const statusCurrent = statusIdentity === (uid ?? "guest") && data?.poll.id === pollId;

  useEffect(() => {
    getJson<{ polls: Poll[] }>("/api/polls")
      .then(({ polls: nextPolls }) => {
        setPolls(nextPolls);
        const requested = new URLSearchParams(window.location.search).get("poll");
        if (requested && !nextPolls.some((poll) => poll.id === requested)) {
          setMessage("The linked poll is not open for voting or is no longer available. Choose an active poll to continue.");
          setTone("error");
          return;
        }
        setPollId(requested || nextPolls[0]?.id || "");
      })
      .catch((error: Error) => {
        setMessage(error.message);
        setTone("error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    ++requestGeneration.current;
    if (!pollId || authLoading) return;
    let active = true;
    Promise.all([
      getJson<PollResults>("/api/results/" + encodeURIComponent(pollId)),
      getJson<VoteStatus>(
        "/api/votes/status?pollId=" + encodeURIComponent(pollId),
      ),
    ])
      .then(([results, status]) => {
        if (!active) return;
        setData(results);
        setVotedPositions(status.votedPositions);
        setVotedAspirants(status.votedAspirants);
        setStatusIdentity(uid ?? "guest");
        const url = new URL(window.location.href);
        const requestedCandidate = url.searchParams.get("candidate");
        if (uid && requestedCandidate) {
          url.searchParams.delete("candidate");
          window.history.replaceState(null, "", url);
          const candidate = results.aspirants.find((item) => item.id === requestedCandidate);
          if (candidate && !status.votedPositions.includes(candidate.position)) {
            setPendingCandidate(candidate);
            confirmation.current?.showModal();
          } else if (!candidate) {
            setMessage("Your selected candidate is no longer available. Please review the ballot.");
            setTone("info");
          }
        }
      })
      .catch((error: Error) => {
        if (!active) return;
        setMessage(error.message);
        setTone("error");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [pollId, uid, authLoading]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Aspirant[]>();
    for (const aspirant of data?.aspirants ?? []) {
      grouped.set(aspirant.position, [...(grouped.get(aspirant.position) ?? []), aspirant]);
    }
    return grouped;
  }, [data]);

  async function vote(aspirant: Aspirant) {
    const generation = requestGeneration.current;
    setBusy(aspirant.id);
    setMessage("");
    try {
      await getJson("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId, aspirantId: aspirant.id }),
      });
      if (generation !== requestGeneration.current) return;
      setVotedPositions((positions) => [...new Set([...positions, aspirant.position])]);
      setVotedAspirants((current) => ({ ...current, [aspirant.position]: aspirant.id }));
      setMessage("Your vote for " + aspirant.name + " as " + aspirant.position + " was recorded.");
      setTone("success");
      const results = await getJson<PollResults>("/api/results/" + encodeURIComponent(pollId)).catch(() => null);
      if (results && generation === requestGeneration.current) setData(results);
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      if (error instanceof RequestError && error.status === 401) {
        await refresh();
        router.push(`/login?poll=${encodeURIComponent(pollId)}&candidate=${encodeURIComponent(aspirant.id)}`);
      }
      if (error instanceof RequestError && error.status === 409) {
        const status = await getJson<VoteStatus>("/api/votes/status?pollId=" + encodeURIComponent(pollId)).catch(() => null);
        if (status && generation === requestGeneration.current) {
          setVotedPositions(status.votedPositions); setVotedAspirants(status.votedAspirants);
        }
      }
      setMessage(error instanceof Error ? error.message : "Vote could not be recorded.");
      setTone("error");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="poll-workspace">
      <div className="poll-control">
        <div>
          <span className="control-label">Current poll</span>
          <strong>{data?.poll.name ?? (loading ? "Loading open polls…" : "Choose a poll")}</strong>
          {data?.poll.description && <p>{data.poll.description}</p>}
        </div>
        <label className="select-field" htmlFor="poll">
          <span>Select an open poll</span>
          <select
            id="poll"
            value={pollId}
            disabled={Boolean(busy)}
            onChange={(event) => {
              setData(null);
              setLoading(true);
              setMessage("");
              setVotedPositions([]);
              setVotedAspirants({});
              setPollId(event.target.value);
              const url = new URL(window.location.href);
              url.searchParams.set("poll", event.target.value);
              url.searchParams.delete("candidate");
              window.history.replaceState(null, "", url);
            }}
          >
            {!polls.length && <option value="">No active polls</option>}
            {polls.length > 0 && !pollId && <option value="" disabled>Select an active poll</option>}
            {polls.map((poll) => <option value={poll.id} key={poll.id}>{poll.name}</option>)}
          </select>
        </label>
      </div>
      {!authLoading && (
        <div className="voter-prompt">
          {user ? <p>Voting as <strong>{user.name}</strong>. One vote per account for each position.</p>
            : <><p>Browse freely. Sign in with Google when you are ready to submit a vote.</p><Link href={`/login?poll=${encodeURIComponent(pollId)}`}>Sign in to vote</Link></>}
        </div>
      )}
      {loading && <p className="notice notice-info" role="status">Loading the ballot…</p>}
      {data && groups.size > 0 && (
        <div className="ballot-progress"><strong>{statusCurrent ? votedPositions.length : 0} of {groups.size} positions completed</strong><span>Review your choice before confirming. Recorded votes cannot be changed.</span></div>
      )}
      <StatusMessage message={message} tone={tone} />
      {pollId && statusCurrent && votedPositions.length > 0 && (
        <div className="vote-results-action">
          <Link className="button button-primary" href={`/results?poll=${encodeURIComponent(pollId)}`}>
            View results
          </Link>
        </div>
      )}
      {!loading && !polls.length && (
        <div className="empty-panel">
          <strong>No open polls right now</strong>
          <p>There are no active polls right now. Check back shortly.</p>
        </div>
      )}
      {[...groups.entries()].map(([position, aspirants], positionIndex) => {
        const voted = statusCurrent && votedPositions.includes(position);
        const votedAspirantId = statusCurrent ? votedAspirants[position] : undefined;
        return (
          <section className="position-block" key={position}>
            <div className="position-heading">
              <span>{String(positionIndex + 1).padStart(2, "0")}</span>
              <div><small>Choose one candidate</small><h2>{position}</h2></div>
              <strong className={voted ? "completion is-complete" : "completion"}>
                {voted ? <><CheckIcon /> Complete</> : "Choose one"}
              </strong>
            </div>
            <div className="candidate-grid">
              {aspirants.map((aspirant) => {
                const selected = votedAspirantId === aspirant.id;
                return (
                  <article className={voted ? `candidate-card is-locked${selected ? " is-selected" : ""}` : "candidate-card"} key={aspirant.id}>
                    <div className="candidate">
                      <CandidatePhoto name={aspirant.name} url={aspirant.imageUrl} />
                      <div className="candidate-main">
                        <h3>{aspirant.name}</h3>
                        <span>{position}</span>
                      </div>
                    </div>
                    <button
                      className={selected ? "candidate-action is-selected" : "candidate-action"}
                      disabled={voted || Boolean(busy) || authLoading || authBusy || !statusCurrent}
                      onClick={() => {
                        if (!user) {
                          router.push(`/login?poll=${encodeURIComponent(pollId)}&candidate=${encodeURIComponent(aspirant.id)}`);
                          return;
                        }
                        setPendingCandidate(aspirant);
                        confirmation.current?.showModal();
                      }}
                    >
                      <span>{voted ? selected ? "Your selection" : "Already voted" : busy === aspirant.id ? "Recording…" : "Select candidate"}</span>
                      {voted && selected ? <CheckIcon /> : null}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      {data && !loading && groups.size === 0 && <div className="empty-panel"><strong>No candidates are listed</strong><p>Please check back later or choose another open poll.</p></div>}
      {pollId && <PollVoteLink key={pollId} pollId={pollId} pollName={polls.find((poll) => poll.id === pollId)?.name} />}
      <dialog ref={confirmation} className="poll-share-dialog confirm-vote-dialog" aria-labelledby="confirm-vote-title" onClose={() => setPendingCandidate(null)}>
        <p className="eyebrow">Review your selection</p>
        <h2 id="confirm-vote-title">Confirm your vote</h2>
        {pendingCandidate && <>
          <p className="muted">{data?.poll.name}</p>
          {user && <p className="muted">Voting as {user.name}</p>}
          <div className="confirmation-candidate"><CandidatePhoto name={pendingCandidate.name} url={pendingCandidate.imageUrl} /><div><strong>{pendingCandidate.name}</strong><span>{pendingCandidate.position}</span></div></div>
          <p className="confirmation-note">Your choice will be recorded for this position. You cannot change it after confirming.</p>
          <div className="dialog-actions"><button type="button" className="button-secondary" onClick={() => confirmation.current?.close()}>Go back</button><button type="button" className="button-primary" disabled={!user || authBusy || !statusCurrent || Boolean(busy)} onClick={() => { const candidate = pendingCandidate; confirmation.current?.close(); void vote(candidate); }}>Confirm vote</button></div>
        </>}
      </dialog>
    </section>
  );
}
