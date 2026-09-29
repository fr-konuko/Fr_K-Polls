"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Poll, Aspirant, Position, POSITION_ORDER } from "@/lib/types";

const PLACEHOLDER = "/assets/placeholder.svg";

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

function ResultsContent() {
  const searchParams = useSearchParams();
  const pollParam = searchParams.get("poll");

  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string>("");
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [selectedChartPosition, setSelectedChartPosition] = useState<string>("President");

  // Subscribe to all polls
  useEffect(() => {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: Poll[] = [];
      snapshot.forEach((d) => {
        rows.push({ id: d.id, ...(d.data() as Omit<Poll, "id">) });
      });
      setPolls(rows);

      if (pollParam && rows.some((p) => p.id === pollParam)) {
        setSelectedPollId(pollParam);
      } else if (rows.length > 0 && !selectedPollId) {
        setSelectedPollId(rows[0].id);
      }
    });

    return () => unsubscribe();
  }, [pollParam, selectedPollId]);

  // Subscribe to aspirants for the selected poll
  useEffect(() => {
    if (!selectedPollId) {
      setAspirants([]);
      return;
    }

    const q = query(collection(db, "aspirants"), where("pollId", "==", selectedPollId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rows: Aspirant[] = [];
      snapshot.forEach((d) => {
        rows.push({
          id: d.id,
          ...(d.data() as Omit<Aspirant, "id">),
          position: normalizePosition(d.data().position),
        });
      });
      setAspirants(rows);

      const positions = Array.from(new Set(rows.map((r) => r.position)));
      if (positions.length > 0 && !positions.includes(selectedChartPosition as Position)) {
        setSelectedChartPosition(positions[0]);
      }
    });

    return () => unsubscribe();
  }, [selectedPollId, selectedChartPosition]);

  // Aggregate metrics
  const totalVotes = aspirants.reduce((sum, a) => sum + (a.votes || 0), 0);
  const totalAspirants = aspirants.length;
  const leading = [...aspirants].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];

  // Group by position
  const grouped: Record<string, Aspirant[]> = {};
  POSITION_ORDER.forEach((p) => {
    grouped[p] = [];
  });
  aspirants.forEach((a) => {
    if (!grouped[a.position]) grouped[a.position] = [];
    grouped[a.position].push(a);
  });

  // Chart rows for selected position
  const chartCandidates = (grouped[selectedChartPosition] || []).sort(
    (a, b) => (b.votes || 0) - (a.votes || 0)
  );
  const chartMaxVotes = Math.max(...chartCandidates.map((c) => c.votes || 0), 1);
  const chartPosTotal = chartCandidates.reduce((sum, c) => sum + (c.votes || 0), 0);

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div>
            <span className="section-kicker">Live Intelligence</span>
            <h1>Verified Results Dashboard</h1>
            <p>
              Monitor live verified vote counts, rankings, and statistical distributions
              across all contests in real-time.
            </p>
          </div>
          <Link className="btn orange" href={`/vote${selectedPollId ? `?poll=${selectedPollId}` : ""}`}>
            Cast your vote &rarr;
          </Link>
        </div>
      </section>

      <main className="page-main">
        <div className="wrap">
          {/* Poll Selection Toolbar */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              <div>
                <label htmlFor="resPollSelect">Select Election / Survey</label>
                <select
                  id="resPollSelect"
                  value={selectedPollId}
                  onChange={(e) => setSelectedPollId(e.target.value)}
                >
                  {polls.length === 0 ? (
                    <option value="">No polls available</option>
                  ) : (
                    polls.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.status === "closed" ? "(Closed)" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="resPosSelect">Focus Position for Chart</label>
                <select
                  id="resPosSelect"
                  value={selectedChartPosition}
                  onChange={(e) => setSelectedChartPosition(e.target.value)}
                >
                  {POSITION_ORDER.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* KPI Summary Cards */}
          <section className="kpis">
            <div className="kpi">
              <div className="label">Total Verified Votes</div>
              <div className="value">{totalVotes.toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="label">Contesting Aspirants</div>
              <div className="value">{totalAspirants.toLocaleString()}</div>
            </div>
            <div className="kpi">
              <div className="label">Overall Leading Candidate</div>
              <div className="value" style={{ fontSize: "1.45rem" }}>
                {leading ? leading.name : "-"}
              </div>
            </div>
          </section>

          {/* Focused Visual Chart */}
          <section className="card" style={{ marginBottom: "32px" }}>
            <div className="position-title" style={{ marginBottom: "20px" }}>
              <h2>{selectedChartPosition} &mdash; Comparative Share</h2>
              <span className="pill">{chartPosTotal.toLocaleString()} votes cast</span>
            </div>

            {chartCandidates.length === 0 ? (
              <p className="small">No candidate data registered for {selectedChartPosition} yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                {chartCandidates.map((c) => {
                  const votes = c.votes || 0;
                  const pct = chartPosTotal > 0 ? Math.round((votes / chartPosTotal) * 100) : 0;
                  const barWidth = Math.max(3, Math.round((votes / chartMaxVotes) * 100));

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "54px 1fr",
                        gap: "14px",
                        alignItems: "center",
                        padding: "12px",
                        background: "var(--soft)",
                        borderRadius: "14px",
                      }}
                    >
                      <img
                        src={c.imageUrl || PLACEHOLDER}
                        alt={c.name}
                        style={{
                          width: "54px",
                          height: "54px",
                          borderRadius: "12px",
                          objectFit: "cover",
                          background: "#e2e8f0",
                        }}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <strong>{c.name}</strong>
                          <span style={{ fontWeight: "700", color: "var(--blue)" }}>
                            {votes.toLocaleString()} votes ({pct}%)
                          </span>
                        </div>
                        <div className="bar-wrap">
                          <div className="bar" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* All Positions Breakdown with Photo Cards */}
          {Object.entries(grouped).map(([position, candidates]) => {
            if (candidates.length === 0) return null;
            const sorted = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));
            const posTotal = sorted.reduce((sum, c) => sum + (c.votes || 0), 0);

            return (
              <section key={position} className="position-block">
                <div className="position-title">
                  <span>{position}</span>
                  <small className="small" style={{ fontWeight: 600 }}>
                    {posTotal.toLocaleString()} total votes
                  </small>
                </div>

                <div className="candidate-grid">
                  {sorted.map((c, index) => {
                    const votes = c.votes || 0;
                    const pct = posTotal > 0 ? Math.round((votes / posTotal) * 100) : 0;

                    return (
                      <article key={c.id} className="candidate-card">
                        <div className="candidate-profile">
                          <img
                            src={c.imageUrl || PLACEHOLDER}
                            alt={c.name}
                            className="candidate-photo"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                            }}
                          />
                          <div className="candidate-info">
                            <h3>{c.name}</h3>
                            <span className="pill">Rank #{index + 1}</span>
                            <div className="bar-wrap">
                              <div className="bar" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="small" style={{ marginTop: "6px" }}>
                              {votes.toLocaleString()} votes &middot; {pct}%
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Comprehensive Results Table */}
          <section className="card" style={{ marginTop: "36px" }}>
            <div className="position-title">
              <h2>Official Returns Table</h2>
            </div>
            <div className="results-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Rank</th>
                    <th>Aspirant</th>
                    <th>Total Votes</th>
                    <th>Vote Share</th>
                  </tr>
                </thead>
                <tbody>
                  {aspirants.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>
                        No results data recorded yet.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(grouped).flatMap(([position, candidates]) => {
                      const sorted = [...candidates].sort(
                        (a, b) => (b.votes || 0) - (a.votes || 0)
                      );
                      const posTotal = sorted.reduce((sum, c) => sum + (c.votes || 0), 0);

                      return sorted.map((c, idx) => {
                        const votes = c.votes || 0;
                        const pct = posTotal > 0 ? Math.round((votes / posTotal) * 100) : 0;

                        return (
                          <tr key={c.id}>
                            <td>
                              <strong>{position}</strong>
                            </td>
                            <td>#{idx + 1}</td>
                            <td>{c.name}</td>
                            <td>{votes.toLocaleString()}</td>
                            <td>
                              <strong>{pct}%</strong>
                            </td>
                          </tr>
                        );
                      });
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-main">
          <div className="wrap">
            <div className="card">Loading live results...</div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
