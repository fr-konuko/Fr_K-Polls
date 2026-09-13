"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { ArrowIcon, CheckIcon } from "@/components/Icons";
import { StatusMessage } from "@/components/StatusMessage";
import type { Aspirant, Poll, PollResults } from "@/lib/types";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function VoteClient() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollId, setPollId] = useState("");
  const [data, setData] = useState<PollResults | null>(null);
  const [votedPositions, setVotedPositions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success" | "info">("info");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<{ polls: Poll[] }>("/api/polls")
      .then(({ polls: nextPolls }) => {
        setPolls(nextPolls);
        const requested = new URLSearchParams(window.location.search).get("poll");
        setPollId(
          requested && nextPolls.some((poll) => poll.id === requested)
            ? requested
            : nextPolls[0]?.id ?? "",
        );
      })
      .catch((error: Error) => {
        setMessage(error.message);
        setTone("error");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pollId) return;
    Promise.all([
      getJson<PollResults>("/api/results/" + encodeURIComponent(pollId)),
      getJson<{ votedPositions: string[] }>("/api/votes/status?pollId=" + encodeURIComponent(pollId)),
    ])
      .then(([results, status]) => {
        setData(results);
        setVotedPositions(status.votedPositions);
      })
      .catch((error: Error) => {
        setMessage(error.message);
        setTone("error");
      })
      .finally(() => setLoading(false));
  }, [pollId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Aspirant[]>();
    for (const aspirant of data?.aspirants ?? []) {
      grouped.set(aspirant.position, [...(grouped.get(aspirant.position) ?? []), aspirant]);
    }
    return grouped;
  }, [data]);

  async function vote(aspirant: Aspirant) {
    if (!window.confirm("Confirm your vote for " + aspirant.name + " as " + aspirant.position + "?")) return;
    setBusy(aspirant.id);
    setMessage("");
    try {
      await getJson("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId, aspirantId: aspirant.id }),
      });
      setVotedPositions((positions) => [...new Set([...positions, aspirant.position])]);
      setMessage("Your " + aspirant.position + " vote was recorded.");
      setTone("success");
      setData(await getJson<PollResults>("/api/results/" + encodeURIComponent(pollId)));
    } catch (error) {
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
          <strong>{data?.poll.name ?? (loading ? "Finding active polls…" : "No active poll")}</strong>
          {data?.poll.description && <p>{data.poll.description}</p>}
        </div>
        <label className="select-field" htmlFor="poll">
          <span>Change poll</span>
          <select id="poll" value={pollId} onChange={(event) => setPollId(event.target.value)}>
            {!polls.length && <option value="">No active polls</option>}
            {polls.map((poll) => <option value={poll.id} key={poll.id}>{poll.name}</option>)}
          </select>
        </label>
      </div>
      <StatusMessage message={message} tone={tone} />
      {!loading && !pollId && (
        <div className="empty-panel">
          <span>Nothing to vote on—yet.</span>
          <p>There are no active polls right now. Check back shortly.</p>
        </div>
      )}
      {[...groups.entries()].map(([position, aspirants], positionIndex) => {
        const voted = votedPositions.includes(position);
        return (
          <section className="position-block" key={position}>
            <div className="position-heading">
              <span>{String(positionIndex + 1).padStart(2, "0")}</span>
              <div><small>Position</small><h2>{position}</h2></div>
              <strong className={voted ? "completion is-complete" : "completion"}>
                {voted ? <><CheckIcon /> Complete</> : "Choose one"}
              </strong>
            </div>
            <div className="candidate-grid">
              {aspirants.map((aspirant) => (
                <article className={voted ? "candidate-card is-locked" : "candidate-card"} key={aspirant.id}>
                  <div className="candidate">
                    <CandidatePhoto name={aspirant.name} url={aspirant.imageUrl} />
                    <div className="candidate-main">
                      <h3>{aspirant.name}</h3>
                      <span>{position}</span>
                    </div>
                  </div>
                  <button className="candidate-action" disabled={voted || Boolean(busy)} onClick={() => vote(aspirant)}>
                    <span>{voted ? "Position complete" : busy === aspirant.id ? "Recording…" : "Select candidate"}</span>
                    {voted ? <CheckIcon /> : <ArrowIcon />}
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
