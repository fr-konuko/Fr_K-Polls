"use client";

import { useEffect, useMemo, useState } from "react";
import { CandidatePhoto } from "@/components/CandidatePhoto";
import { ChartIcon } from "@/components/Icons";
import { StatusMessage } from "@/components/StatusMessage";
import type { Aspirant, Poll, PollResults } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function ResultsClient() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollId, setPollId] = useState("");
  const [data, setData] = useState<PollResults | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<{ polls: Poll[] }>("/api/polls?scope=results")
      .then(({ polls: nextPolls }) => {
        setPolls(nextPolls);
        const requested = new URLSearchParams(window.location.search).get("poll");
        setPollId(
          requested && nextPolls.some((poll) => poll.id === requested)
            ? requested
            : nextPolls[0]?.id ?? "",
        );
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!pollId) return;
    let active = true;
    const load = () =>
      getJson<PollResults>("/api/results/" + encodeURIComponent(pollId))
        .then((results) => active && setData(results))
        .catch((error: Error) => active && setMessage(error.message));
    void load();
    const timer = window.setInterval(load, 10_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pollId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Aspirant[]>();
    for (const aspirant of data?.aspirants ?? []) {
      grouped.set(aspirant.position, [...(grouped.get(aspirant.position) ?? []), aspirant]);
    }
    for (const [position, aspirants] of grouped) {
      grouped.set(
        position,
        [...aspirants].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name)),
      );
    }
    return grouped;
  }, [data]);

  return (
    <section className="poll-workspace">
      <div className="poll-control">
        <div>
          <span className="control-label">Showing results for</span>
          <strong>{data?.poll.name ?? (loading ? "Loading the latest…" : "No published poll")}</strong>
          <p>{data?.poll.description || "Select a poll to explore its results."}</p>
        </div>
        <label className="select-field" htmlFor="results-poll">
          <span>Change poll</span>
          <select
            id="results-poll"
            value={pollId}
            onChange={(event) => setPollId(event.target.value)}
          >
            {!polls.length && <option value="">No published results</option>}
            {polls.map((poll) => (
              <option value={poll.id} key={poll.id}>
                {poll.name}{poll.status === "closed" ? " · Closed" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <StatusMessage message={message} />

      {!loading && !pollId && (
        <div className="empty-panel">
          <span>No results to show.</span>
          <p>Published poll results will appear here.</p>
        </div>
      )}

      {[...groups.entries()].map(([position, aspirants], positionIndex) => {
        const total = aspirants.reduce((sum, aspirant) => sum + aspirant.votes, 0);
        return (
          <section className="position-block results-block" key={position}>
            <div className="position-heading">
              <span>{String(positionIndex + 1).padStart(2, "0")}</span>
              <div>
                <small>Position</small>
                <h2>{position}</h2>
              </div>
              <strong className="result-total">
                <ChartIcon /> {total} vote{total === 1 ? "" : "s"}
              </strong>
            </div>

            <div className="result-list">
              {aspirants.map((aspirant, index) => {
                const percentage = total
                  ? Math.round((aspirant.votes / total) * 100)
                  : 0;
                return (
                  <article className="result-row" key={aspirant.id}>
                    <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                    <CandidatePhoto name={aspirant.name} url={aspirant.imageUrl} />
                    <div className="candidate-main">
                      <div className="result-name">
                        <h3>{aspirant.name}</h3>
                        {index === 0 && total > 0 && <span>Leading</span>}
                      </div>
                      <div className="result-meta">
                        <span>{aspirant.votes} vote{aspirant.votes === 1 ? "" : "s"}</span>
                        <strong>{percentage}%</strong>
                      </div>
                      <div className="bar-track" aria-label={percentage + " percent"}>
                        <div className="bar" style={{ width: percentage + "%" }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
