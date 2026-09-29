"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Poll, Aspirant, ContactMessage, Position, POSITION_ORDER } from "@/lib/types";

const PLACEHOLDER = "/assets/placeholder.svg";

export default function PortalDashboard() {
  const [activeTab, setActiveTab] = useState<"polls" | "aspirants" | "messages" | "share">("polls");

  // Data states
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string>("");
  const [aspirants, setAspirants] = useState<Aspirant[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [status, setStatus] = useState<{ text: string; type: "good" | "bad" } | null>(null);

  // Form states
  const [pollName, setPollName] = useState("");
  const [pollDesc, setPollDesc] = useState("");
  const [pollStatus, setPollStatus] = useState<"active" | "closed">("active");

  const [aspName, setAspName] = useState("");
  const [aspPos, setAspPos] = useState<Position>("President");
  const [aspImage, setAspImage] = useState("");

  // Copy states
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Subscribe to polls
  useEffect(() => {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: Poll[] = [];
      snap.forEach((d) => {
        rows.push({ id: d.id, ...(d.data() as Omit<Poll, "id">) });
      });
      setPolls(rows);
      if (!selectedPollId && rows.length > 0) {
        setSelectedPollId(rows[0].id);
      }
    });
    return () => unsub();
  }, [selectedPollId]);

  // Subscribe to aspirants for selected poll
  useEffect(() => {
    if (!selectedPollId) {
      setAspirants([]);
      return;
    }
    const q = query(collection(db, "aspirants"), where("pollId", "==", selectedPollId));
    const unsub = onSnapshot(q, (snap) => {
      const rows: Aspirant[] = [];
      snap.forEach((d) => {
        rows.push({ id: d.id, ...(d.data() as Omit<Aspirant, "id">) });
      });
      setAspirants(rows);
    });
    return () => unsub();
  }, [selectedPollId]);

  // Subscribe to contact messages
  useEffect(() => {
    const q = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ContactMessage[] = [];
      snap.forEach((d) => {
        rows.push({ id: d.id, ...(d.data() as Omit<ContactMessage, "id">) });
      });
      setMessages(rows);
    });
    return () => unsub();
  }, []);

  // Poll creation
  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    if (!pollName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, "polls"), {
        name: pollName.trim(),
        description: pollDesc.trim(),
        status: pollStatus,
        createdAt: serverTimestamp(),
      });
      setPollName("");
      setPollDesc("");
      setSelectedPollId(docRef.id);
      setStatus({ text: "Poll created successfully.", type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to create poll.", type: "bad" });
    }
  }

  // Poll closure
  async function handleEndPoll(pollId: string) {
    if (!window.confirm("End this poll? Voters will no longer be able to submit new ballots.")) return;
    try {
      await updateDoc(doc(db, "polls", pollId), {
        status: "closed",
        closedAt: serverTimestamp(),
      });
      setStatus({ text: "Poll closed successfully.", type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to close poll.", type: "bad" });
    }
  }

  // Poll Cascade Deletion (Resolves MED-04)
  async function handleDeletePoll(pollId: string) {
    if (!window.confirm("Permanently delete this poll and all associated candidates and votes? This action cannot be undone.")) return;

    try {
      const batch = writeBatch(db);

      // 1. Delete matching aspirants
      const aspQuery = query(collection(db, "aspirants"), where("pollId", "==", pollId));
      const aspSnap = await getDocs(aspQuery);
      aspSnap.forEach((d) => batch.delete(d.ref));

      // 2. Delete matching votes
      const voteQuery = query(collection(db, "votes"), where("pollId", "==", pollId));
      const voteSnap = await getDocs(voteQuery);
      voteSnap.forEach((d) => batch.delete(d.ref));

      // 3. Delete poll document
      batch.delete(doc(db, "polls", pollId));

      await batch.commit();

      if (selectedPollId === pollId) {
        setSelectedPollId(polls.find((p) => p.id !== pollId)?.id || "");
      }
      setStatus({ text: "Poll and all associated records deleted cleanly.", type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to delete poll.", type: "bad" });
    }
  }

  // Aspirant creation
  async function handleAddAspirant(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPollId || !aspName.trim()) {
      setStatus({ text: "Please select a poll and provide the candidate's name.", type: "bad" });
      return;
    }

    try {
      await addDoc(collection(db, "aspirants"), {
        pollId: selectedPollId,
        name: aspName.trim(),
        position: aspPos,
        imageUrl: aspImage.trim(),
        votes: 0,
        createdAt: serverTimestamp(),
      });
      setAspName("");
      setAspImage("");
      setStatus({ text: `Candidate ${aspName} added successfully.`, type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to add candidate.", type: "bad" });
    }
  }

  // Aspirant deletion
  async function handleDeleteAspirant(aspId: string) {
    if (!window.confirm("Delete this candidate record?")) return;
    try {
      await deleteDoc(doc(db, "aspirants", aspId));
      setStatus({ text: "Candidate record deleted.", type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to delete candidate.", type: "bad" });
    }
  }

  // Message status toggle
  async function handleToggleMessage(msgId: string, currentStatus: "new" | "read") {
    try {
      await updateDoc(doc(db, "contactMessages", msgId), {
        status: currentStatus === "new" ? "read" : "new",
      });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to update inquiry.", type: "bad" });
    }
  }

  // Message delete
  async function handleDeleteMessage(msgId: string) {
    if (!window.confirm("Delete this contact inquiry?")) return;
    try {
      await deleteDoc(doc(db, "contactMessages", msgId));
      setStatus({ text: "Inquiry message deleted.", type: "good" });
    } catch (err: any) {
      setStatus({ text: err.message || "Failed to delete inquiry.", type: "bad" });
    }
  }

  const unreadMessagesCount = messages.filter((m) => m.status === "new").length;

  // Share links helper
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const votingLink = selectedPollId ? `${origin}/vote?poll=${selectedPollId}` : `${origin}/vote`;
  const resultsLink = selectedPollId ? `${origin}/results?poll=${selectedPollId}` : `${origin}/results`;

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied to clipboard!`);
      setTimeout(() => setCopyStatus(null), 3000);
    } catch {
      setCopyStatus("Failed to copy automatically.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <span className="section-kicker">Operations Dashboard</span>
          <h1 style={{ color: "#ffffff", fontSize: "2.2rem" }}>Control Center</h1>
        </div>
      </div>

      {status && (
        <div className={`status ${status.type === "good" ? "good" : "bad"}`} role="alert">
          {status.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === "polls" ? "active" : ""}`}
          onClick={() => { setActiveTab("polls"); setStatus(null); }}
        >
          Polls &amp; Surveys ({polls.length})
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === "aspirants" ? "active" : ""}`}
          onClick={() => { setActiveTab("aspirants"); setStatus(null); }}
        >
          Candidates ({aspirants.length})
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === "messages" ? "active" : ""}`}
          onClick={() => { setActiveTab("messages"); setStatus(null); }}
        >
          Contact Inbox {unreadMessagesCount > 0 && `(${unreadMessagesCount} new)`}
        </button>

        <button
          type="button"
          className={`admin-tab ${activeTab === "share" ? "active" : ""}`}
          onClick={() => { setActiveTab("share"); setStatus(null); }}
        >
          Share Links
        </button>
      </div>

      {/* TAB 1: POLLS MANAGEMENT */}
      {activeTab === "polls" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
          {/* Create Poll */}
          <div className="admin-card">
            <h2>Create New Poll</h2>
            <form onSubmit={handleCreatePoll} style={{ marginTop: "16px" }}>
              <label htmlFor="pName">Poll Name</label>
              <input
                id="pName"
                required
                placeholder="e.g. 2026 Nairobi Gubernatorial Preference"
                value={pollName}
                onChange={(e) => setPollName(e.target.value)}
              />

              <label htmlFor="pDesc">Brief Description</label>
              <textarea
                id="pDesc"
                rows={3}
                placeholder="Short description of audience, purpose, and scope"
                value={pollDesc}
                onChange={(e) => setPollDesc(e.target.value)}
              />

              <label htmlFor="pStat">Initial Status</label>
              <select
                id="pStat"
                value={pollStatus}
                onChange={(e) => setPollStatus(e.target.value as "active" | "closed")}
              >
                <option value="active">Active (Voting Enabled)</option>
                <option value="closed">Closed (Archive / Results Only)</option>
              </select>

              <button type="submit" className="btn orange" style={{ width: "100%", marginTop: "10px" }}>
                Save &amp; Activate Poll &rarr;
              </button>
            </form>
          </div>

          {/* Current Polls List */}
          <div className="admin-card">
            <h2>Current Polls &amp; Surveys</h2>
            {polls.length === 0 ? (
              <p className="small" style={{ marginTop: "16px" }}>No polls created yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
                {polls.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: "16px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div>
                        <strong>{p.name}</strong>
                        <p className="small" style={{ color: "#94a3b8", marginTop: "4px" }}>
                          {p.description || "No description provided."}
                        </p>
                      </div>
                      <span
                        className="pill"
                        style={{
                          background: p.status === "active" ? "var(--green-light)" : "var(--soft)",
                          color: p.status === "active" ? "var(--green)" : "var(--muted)",
                        }}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                      {p.status === "active" && (
                        <button
                          type="button"
                          className="btn outline light"
                          style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                          onClick={() => handleEndPoll(p.id)}
                        >
                          End Poll
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn danger"
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                        onClick={() => handleDeletePoll(p.id)}
                      >
                        Delete with Cascade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ASPIRANTS MANAGER */}
      {activeTab === "aspirants" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
          {/* Add Candidate Form */}
          <div className="admin-card">
            <h2>Add Candidate / Aspirant</h2>
            <form onSubmit={handleAddAspirant} style={{ marginTop: "16px" }}>
              <label htmlFor="aspPoll">Target Poll</label>
              <select
                id="aspPoll"
                value={selectedPollId}
                onChange={(e) => setSelectedPollId(e.target.value)}
              >
                {polls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label htmlFor="aName">Full Name</label>
              <input
                id="aName"
                required
                placeholder="Hon. Candidate Name"
                value={aspName}
                onChange={(e) => setAspName(e.target.value)}
              />

              <label htmlFor="aPos">Contesting Position</label>
              <select
                id="aPos"
                value={aspPos}
                onChange={(e) => setAspPos(e.target.value as Position)}
              >
                {POSITION_ORDER.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>

              <label htmlFor="aImg">Photo URL</label>
              <input
                id="aImg"
                placeholder="https://... direct image link (.jpg, .png, .webp)"
                value={aspImage}
                onChange={(e) => setAspImage(e.target.value)}
              />

              <button type="submit" className="btn orange" style={{ width: "100%", marginTop: "10px" }}>
                Add Candidate &rarr;
              </button>
            </form>
          </div>

          {/* Current Aspirants List */}
          <div className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>Current Candidates</h2>
              <span className="small" style={{ color: "#94a3b8" }}>
                {aspirants.length} registered
              </span>
            </div>

            {aspirants.length === 0 ? (
              <p className="small">No candidates registered for the selected poll yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "12px", maxHeight: "600px", overflowY: "auto" }}>
                {aspirants.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={a.imageUrl || PLACEHOLDER}
                        alt={a.name}
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          objectFit: "cover",
                          background: "#e2e8f0",
                        }}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                      <div>
                        <strong style={{ color: "#ffffff" }}>{a.name}</strong>
                        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                          <span className="pill">{a.position}</span>
                          <span className="small" style={{ color: "#94a3b8" }}>
                            {a.votes || 0} votes
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn danger"
                      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                      onClick={() => handleDeleteAspirant(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT INBOX */}
      {activeTab === "messages" && (
        <div className="admin-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2>Inbound Project Inquiries</h2>
            <span className="pill">
              {unreadMessagesCount} Unread &middot; {messages.length} Total
            </span>
          </div>

          {messages.length === 0 ? (
            <p className="small">No website contact inquiries submitted yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {messages.map((m) => (
                <article
                  key={m.id}
                  style={{
                    padding: "20px",
                    background: m.status === "new" ? "rgba(239, 143, 47, 0.08)" : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${m.status === "new" ? "var(--orange)" : "rgba(255, 255, 255, 0.1)"}`,
                    borderRadius: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                    <div>
                      <strong style={{ fontSize: "1.1rem", color: "#ffffff" }}>{m.name}</strong>
                      <span className="small" style={{ color: "#94a3b8", marginLeft: "10px" }}>
                        {m.organization ? `${m.organization} \u2022 ` : ""}{m.email}
                      </span>
                    </div>
                    <span
                      className="pill"
                      style={{
                        background: m.status === "new" ? "var(--orange)" : "rgba(255, 255, 255, 0.1)",
                        color: "#ffffff",
                      }}
                    >
                      {m.status === "new" ? "New Inquiry" : "Read"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "12px" }}>
                    <span><b>Service:</b> {m.service}</span>
                    {m.phone && <span><b>Phone:</b> {m.phone}</span>}
                  </div>

                  <p style={{ color: "#e2e8f0", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                    {m.message}
                  </p>

                  <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <button
                      type="button"
                      className="btn outline light"
                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => handleToggleMessage(m.id, m.status)}
                    >
                      Mark as {m.status === "new" ? "Read" : "New"}
                    </button>
                    <button
                      type="button"
                      className="btn danger"
                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => handleDeleteMessage(m.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SHARE LINKS */}
      {activeTab === "share" && (
        <div className="admin-card" style={{ maxWidth: "700px" }}>
          <h2>Public Distribution Links</h2>
          <p className="small" style={{ color: "#94a3b8", margin: "8px 0 24px" }}>
            Copy and distribute these public links to voters and media outlets.
            Notice: Public pages have zero administrator links or controls.
          </p>

          {copyStatus && (
            <div className="status good" style={{ marginBottom: "16px" }}>
              {copyStatus}
            </div>
          )}

          <label htmlFor="sharePoll">Select Target Poll</label>
          <select
            id="sharePoll"
            value={selectedPollId}
            onChange={(e) => setSelectedPollId(e.target.value)}
            style={{ marginBottom: "20px" }}
          >
            {polls.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label htmlFor="vLink">Public Voting Page Link</label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input id="vLink" readOnly value={votingLink} style={{ margin: 0 }} />
            <button
              type="button"
              className="btn orange"
              onClick={() => copyToClipboard(votingLink, "Voting Link")}
              style={{ whiteSpace: "nowrap" }}
            >
              Copy Link
            </button>
          </div>

          <label htmlFor="rLink">Public Live Results Link</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input id="rLink" readOnly value={resultsLink} style={{ margin: 0 }} />
            <button
              type="button"
              className="btn outline light"
              onClick={() => copyToClipboard(resultsLink, "Results Link")}
              style={{ whiteSpace: "nowrap" }}
            >
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
