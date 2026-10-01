"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import type { Aspirant, Poll, PollResults } from "@/lib/types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body as T;
}

export function ReportsClient() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollId, setPollId] = useState("");
  const [report, setReport] = useState<PollResults | null>(null);
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
        if (!nextPolls.length) setLoading(false);
      })
      .catch((error: Error) => {
        setMessage(error.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!pollId) return;
    let active = true;
    getJson<PollResults>("/api/results/" + encodeURIComponent(pollId))
      .then((nextReport) => active && setReport(nextReport))
      .catch((error: Error) => active && setMessage(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [pollId]);

  const positions = [...new Set((report?.aspirants ?? []).map((aspirant) => aspirant.position))];
  const totalSelections = (report?.aspirants ?? []).reduce(
    (total, aspirant) => total + aspirant.votes,
    0,
  );
  const leaders = positions.filter((position) =>
    (report?.aspirants ?? []).some((aspirant) => aspirant.position === position && aspirant.votes > 0),
  ).length;
  const reportDate = report?.poll.closedAt ?? report?.poll.createdAt;

  return (
    <section>
      <div className="report-toolbar">
        <label className="select-field" htmlFor="report-poll">
          <span>Select a poll</span>
          <select
            id="report-poll"
            value={pollId}
            onChange={(event) => {
              setLoading(true);
              setMessage("");
              setPollId(event.target.value);
            }}
          >
            {!polls.length && <option value="">No published reports</option>}
            {polls.map((poll) => (
              <option value={poll.id} key={poll.id}>
                {poll.name}{poll.status === "closed" ? " · Closed" : " · Live"}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="button" onClick={() => window.print()} disabled={!report}>
          Print or save as PDF
        </button>
      </div>

      <StatusMessage message={message} />

      {loading && <div className="empty-panel"><span>Loading report…</span></div>}

      {!loading && !pollId && (
        <div className="empty-panel">
          <div>
            <strong>No published polls yet.</strong>
            <p>Once a poll is published, its results will be available here as a printable report.</p>
          </div>
        </div>
      )}

      {report && report.poll.id === pollId && (
        <article className="report-document">
          <header className="report-heading">
            <div>
              <span className="eyebrow">Frk Polls · Poll report</span>
              <h2>{report.poll.name}</h2>
              {report.poll.description && <p>{report.poll.description}</p>}
            </div>
            <span className="report-status">{report.poll.status}</span>
          </header>

          <div className="report-summary" aria-label="Poll summary">
            <div><strong>{totalSelections.toLocaleString()}</strong><span>Selections counted</span></div>
            <div><strong>{positions.length}</strong><span>Positions reported</span></div>
            <div><strong>{report.aspirants.length}</strong><span>Candidates listed</span></div>
            <div><strong>{leaders}</strong><span>Positions with votes</span></div>
          </div>

          {positions.map((position, index) => {
            const candidates = report.aspirants
              .filter((aspirant) => aspirant.position === position)
              .sort((first: Aspirant, second: Aspirant) => second.votes - first.votes || first.name.localeCompare(second.name));
            const positionTotal = candidates.reduce((total, candidate) => total + candidate.votes, 0);

            return (
              <section className="report-position" key={position}>
                <h3>{String(index + 1).padStart(2, "0")} · {position}</h3>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr><th scope="col">Rank</th><th scope="col">Candidate</th><th scope="col">Votes</th><th scope="col">Share</th></tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate, candidateIndex) => {
                        const share = positionTotal ? Math.round((candidate.votes / positionTotal) * 100) : 0;
                        return (
                          <tr key={candidate.id}>
                            <td>{String(candidateIndex + 1).padStart(2, "0")}</td>
                            <td className={candidateIndex === 0 && candidate.votes > 0 ? "report-leader" : undefined}>
                              {candidate.name}{candidateIndex === 0 && candidate.votes > 0 ? " · Leading" : ""}
                            </td>
                            <td>{candidate.votes.toLocaleString()}</td>
                            <td>{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          <p className="report-note">
            {reportDate
              ? `${report.poll.closedAt ? "Poll closed" : "Poll opened"} ${new Date(reportDate).toLocaleDateString()}. Vote totals reflect the latest published results.`
              : "Vote totals reflect the latest published results."}
          </p>
        </article>
      )}
    </section>
  );
}