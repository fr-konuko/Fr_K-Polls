"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Poll, Aspirant, Position, POSITION_ORDER } from "@/lib/types";

const PLACEHOLDER = "/assets/placeholder.svg";
const TOKEN_KEY = "frk_poll_browser_token";

function getBrowserToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token =
        window.crypto && typeof window.crypto.randomUUID === "function"
          ? window.crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

function normalizePosition(p: string): Position {
  const norm = p.trim().toLowerCase();
  if (norm === "senetor" || norm === "senator") return "Senator";
  if (norm.includes("president")) return "President";
  if (norm.includes("governor")) return "Governor";
  if (norm.includes("women") || norm.includes("woman")) return "Women Rep";
  if (norm.includes("parliament") || norm === "mp") return "Member of Parliament";
  if (norm.includes("mca")) return "MCA";
  return (p as Position) || "Member of Parliament";
}

function VoteContent() {
  const searchParams = useSearchParams();
  const pollParam = searchParams.get("poll");

  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string>("");
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [votedPositions, setVotedPositions] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "good" | "bad" } | null>(null);
  const [votingLoading, setVotingLoading] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Load active polls
  useEffect(() => {
    async function loadPolls() {
      try {
        const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const rows: Poll[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as Omit<Poll, "id">;
          if ((data.status || "active") === "active") {
            rows.push({ id: d.id, ...data });
          }
        });
        setPolls(rows);

        if (pollParam && rows.some((p) => p.id === pollParam)) {
          setSelectedPollId(pollParam);
        } else if (rows.length > 0) {
          setSelectedPollId(rows[0].id);
        }
      } catch (err) {
        console.error("Failed to load polls:", err);
        setStatusMsg({ text: "Unable to load polls. Please refresh or check connection.", type: "bad" });
      } finally {
        setPageLoading(false);
      }
    }
    loadPolls();
  }, [pollParam]);

  // Load aspirants and check per-position votes for selected poll
  useEffect(() => {
    if (!selectedPollId) {
      setAspirants([]);
      return;
    }

    async function loadPollAspirants() {
      try {
        const q = query(
          collection(db, "aspirants"),
          where("pollId", "==", selectedPollId)
        );
        const snapshot = await getDocs(q);
        const rows: Aspirant[] = [];
        snapshot.forEach((d) => {
          rows.push({ id: d.id, ...(d.data() as Omit<Aspirant, "id">) });
        });
        setAspirants(rows);

        // Check voted status per position (MED-02 Fix)
        const token = getBrowserToken();
        const positions = Array.from(new Set(rows.map((r) => normalizePosition(r.position))));
        const votesStatus: Record<string, boolean> = {};

        await Promise.all(
          positions.map(async (pos) => {
            const voteDocId = `${selectedPollId}_${encodeURIComponent(pos)}_${token}`;
            try {
              const voteDoc = await getDocs(
                query(collection(db, "votes"), where("__name__", "==", voteDocId))
              );
              votesStatus[pos] = !voteDoc.empty;
            } catch {
              votesStatus[pos] = false;
            }
          })
        );
        setVotedPositions(votesStatus);
      } catch (err) {
        console.error("Failed to load aspirants:", err);
      }
    }

    loadPollAspirants();
  }, [selectedPollId]);

  async function handleVote(aspirant: Aspirant) {
    const pos = normalizePosition(aspirant.position);
    const token = getBrowserToken();

    if (votedPositions[pos]) {
      setStatusMsg({ text: `You have already cast your vote for ${pos} in this poll.`, type: "bad" });
      return;
    }

    if (
      !window.confirm(
        `Confirm your vote for ${aspirant.name} as ${pos}? This ballot is final for this position.`
      )
    ) {
      return;
    }

    setVotingLoading(aspirant.id);
    setStatusMsg(null);

    try {
      const voteDocId = `${selectedPollId}_${encodeURIComponent(pos)}_${token}`;
      const voteRef = doc(db, "votes", voteDocId);
      const aspirantRef = doc(db, "aspirants", aspirant.id);

      await runTransaction(db, async (transaction) => {
        const existingVote = await transaction.get(voteRef);
        if (existingVote.exists()) {
          throw new Error(`You have already voted for ${pos} in this poll.`);
        }

        transaction.set(voteRef, {
          pollId: selectedPollId,
          position: pos,
          aspirantId: aspirant.id,
          browserToken: token,
          createdAt: serverTimestamp(),
        });

        transaction.update(aspirantRef, {
          votes: increment(1),
        });
      });

      setVotedPositions((prev) => ({ ...prev, [pos]: true }));
      setStatusMsg({
        text: `Your vote for ${aspirant.name} (${pos}) has been recorded successfully!`,
        type: "good",
      });
    } catch (err: any) {
      console.error("Vote submission error:", err);
      setStatusMsg({ text: err.message || "Vote failed. Please try again.", type: "bad" });
    } finally {
      setVotingLoading(null);
    }
  }

  // Group candidates by Position
  const groupedAspirants: Record<string, Aspirant[]> = {};
  POSITION_ORDER.forEach((p) => {
    groupedAspirants[p] = [];
  });
  aspirants.forEach((a) => {
    const pos = normalizePosition(a.position);
    if (!groupedAspirants[pos]) groupedAspirants[pos] = [];
    groupedAspirants[pos].push({ ...a, position: pos });
  });

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div>
            <span className="section-kicker">Public Ballot</span>
            <h1>Live Voting Portal</h1>
            <p>
              Select an active poll below to cast your vote for each contest. Your ballot
              is recorded per position with verified one-vote enforcement.
            </p>
          </div>
          <Link className="btn orange" href={`/results${selectedPollId ? `?poll=${selectedPollId}` : ""}`}>
            View live results &rarr;
          </Link>
        </div>
      </section>

      <main className="page-main">
        <div className="wrap">
          {statusMsg && (
            <div className={`status ${statusMsg.type === "good" ? "good" : "bad"}`} role="alert">
              {statusMsg.text}
            </div>
          )}

          {/* Poll Selection Toolbar */}
          <section className="card" style={{ marginBottom: "28px" }}>
            <label htmlFor="pollSelect">Select Active Election / Opinion Poll</label>
            {pageLoading ? (
              <p className="small">Loading polls...</p>
            ) : polls.length === 0 ? (
              <p>No active polls currently available.</p>
            ) : (
              <select
                id="pollSelect"
                value={selectedPollId}
                onChange={(e) => {
                  setSelectedPollId(e.target.value);
                  setStatusMsg(null);
                }}
              >
                {polls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Multi-Position Ballot (Resolves MED-02) */}
          {aspirants.length === 0 && !pageLoading && (
            <div className="card">
              <span className="section-kicker">Candidates</span>
              <h3>No aspirants currently registered for this poll.</h3>
              <p className="small">The administrator has not added candidates to this poll yet.</p>
            </div>
          )}

          {Object.entries(groupedAspirants).map(([position, candidates]) => {
            if (candidates.length === 0) return null;
            const hasVotedThisPos = Boolean(votedPositions[position]);

            return (
              <section key={position} className="position-block">
                <div className="position-title">
                  <span>{position}</span>
                  {hasVotedThisPos && (
                    <span
                      style={{
                        background: "var(--green-light)",
                        color: "var(--green)",
                        borderColor: "#a3e6cb",
                      }}
                    >
                      &#10003; Ballot Cast
                    </span>
                  )}
                </div>

                <div className="candidate-grid">
                  {candidates.map((candidate) => {
                    const isVotingThis = votingLoading === candidate.id;

                    return (
                      <article key={candidate.id} className="candidate-card">
                        <div className="candidate-profile">
                          <img
                            src={candidate.imageUrl || PLACEHOLDER}
                            alt={candidate.name}
                            className="candidate-photo"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                            }}
                          />
                          <div className="candidate-info">
                            <h3>{candidate.name}</h3>
                            <span className="pill">{position}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={hasVotedThisPos ? "btn outline" : "btn orange"}
                          disabled={hasVotedThisPos || isVotingThis}
                          onClick={() => handleVote(candidate)}
                        >
                          {isVotingThis
                            ? "Recording vote..."
                            : hasVotedThisPos
                            ? "Ballot cast"
                            : `Vote for ${candidate.name}`}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <div className="page-main">
          <div className="wrap">
            <div className="card">Loading voting ballot...</div>
          </div>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}
