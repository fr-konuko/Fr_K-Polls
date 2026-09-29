"use client";

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    service: "",
    message: "",
    consent: false,
    hp_field: "", // Honeypot spam defense (HIGH-04 Fix)
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: "good" | "bad" } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Honeypot spam trap check
    if (formData.hp_field) {
      // Silently discard bot submission
      setStatus({ text: "Your inquiry has been submitted successfully.", type: "good" });
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.service || !formData.message.trim() || !formData.consent) {
      setStatus({ text: "Please complete all required fields and accept the consent agreement.", type: "bad" });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setStatus({ text: "Please provide a valid email address.", type: "bad" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await addDoc(collection(db, "contactMessages"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
        service: formData.service,
        message: formData.message.trim(),
        status: "new",
        source: "nextjs-contact-form",
        createdAt: serverTimestamp(),
      });

      setStatus({
        text: "Thank you for reaching out. Your project inquiry has been sent to our research team.",
        type: "good",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        organization: "",
        service: "",
        message: "",
        consent: false,
        hp_field: "",
      });
    } catch (err: any) {
      console.error("Contact submission error:", err);
      setStatus({
        text: "Unable to submit inquiry at this moment. Please check your connection and try again.",
        type: "bad",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div>
            <span className="section-kicker">Strategic Engagement</span>
            <h1>Contact JOPA Research Africa</h1>
            <p>
              Tell us what you need to measure, understand, or report. We provide end-to-end
              research methodology, opinion polling, and live data dashboard solutions.
            </p>
          </div>
        </div>
      </section>

      <main className="page-main">
        <div className="wrap">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "48px", alignItems: "start" }}>
            {/* Context & Capabilities */}
            <div>
              <span className="section-kicker">How we help</span>
              <h2 style={{ fontSize: "2.1rem", margin: "10px 0 16px" }}>Have a research or polling project?</h2>
              <p style={{ color: "var(--muted)", marginBottom: "28px" }}>
                Share a short description of your objective and timelines. Our research
                consultants will help you define sample frames, survey instruments, and
                visualization dashboards.
              </p>

              <div style={{ display: "grid", gap: "16px" }}>
                <article style={{ display: "flex", gap: "16px", padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", fontWeight: "800", fontSize: "0.8rem", flexShrink: 0 }}>
                    01
                  </span>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Opinion Polls &amp; Surveys</strong>
                    <p className="small">Public sentiment surveys, election candidate preference polls, and civic focus groups.</p>
                  </div>
                </article>

                <article style={{ display: "flex", gap: "16px", padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", fontWeight: "800", fontSize: "0.8rem", flexShrink: 0 }}>
                    02
                  </span>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Dashboards &amp; Analytics</strong>
                    <p className="small">Data cleaning, real-time verified voting dashboards, and visual charts for teams.</p>
                  </div>
                </article>

                <article style={{ display: "flex", gap: "16px", padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "grid", placeItems: "center", fontWeight: "800", fontSize: "0.8rem", flexShrink: 0 }}>
                    03
                  </span>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Strategic Decision Reports</strong>
                    <p className="small">Methodological rigor with executive-level summaries designed for action.</p>
                  </div>
                </article>
              </div>
            </div>

            {/* Inquiries Form Card */}
            <div className="card" style={{ padding: "34px", boxShadow: "var(--shadow-md)" }}>
              <span className="section-kicker">Project Inquiry</span>
              <h2 style={{ marginBottom: "8px" }}>Send us a message</h2>
              <p className="small" style={{ marginBottom: "20px" }}>
                Complete the inquiry form below and our team will get back to you promptly.
              </p>

              {status && (
                <div className={`status ${status.type === "good" ? "good" : "bad"}`} role="alert">
                  {status.text}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Honeypot hidden input (Spam protection) */}
                <input
                  type="text"
                  name="hp_field"
                  value={formData.hp_field}
                  onChange={(e) => setFormData({ ...formData, hp_field: e.target.value })}
                  style={{ display: "none" }}
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                  <div>
                    <label htmlFor="cName">Your Name *</label>
                    <input
                      id="cName"
                      required
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="cEmail">Email Address *</label>
                    <input
                      id="cEmail"
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                  <div>
                    <label htmlFor="cPhone">Phone Number</label>
                    <input
                      id="cPhone"
                      type="tel"
                      placeholder="Optional"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="cOrg">Organization</label>
                    <input
                      id="cOrg"
                      placeholder="Company, NGO, or Campaign"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>
                </div>

                <label htmlFor="cService">What research support do you need? *</label>
                <select
                  id="cService"
                  required
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                >
                  <option value="">Select a service category</option>
                  <option>Opinion Polls &amp; Voting</option>
                  <option>Surveys &amp; Data Collection</option>
                  <option>Data Analysis</option>
                  <option>Dashboards &amp; Visualization</option>
                  <option>Insight Reports</option>
                  <option>Monitoring &amp; Evaluation Support</option>
                  <option>Other Custom Inquiry</option>
                </select>

                <label htmlFor="cMessage">Tell us about your project *</label>
                <textarea
                  id="cMessage"
                  rows={5}
                  required
                  placeholder="What would you like to measure or achieve? Include audience, geographical coverage, and timelines if relevant."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />

                <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", margin: "10px 0 20px", fontWeight: "normal", fontSize: "0.86rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    required
                    checked={formData.consent}
                    onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                    style={{ width: "18px", height: "18px", margin: "3px 0 0", flexShrink: 0 }}
                  />
                  <span>
                    I consent to JOPA Research Africa processing the submitted details to respond to this inquiry.
                  </span>
                </label>

                <button type="submit" className="btn orange" disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Sending inquiry..." : "Submit inquiry \u2192"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
