"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Poll } from "@/lib/types";

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivePolls() {
      try {
        const q = query(
          collection(db, "polls"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const rows: Poll[] = [];
        snapshot.forEach((doc) => {
          rows.push({ id: doc.id, ...(doc.data() as Omit<Poll, "id">) });
        });
        setPolls(rows);
      } catch (err) {
        console.warn("Could not fetch active polls from Firestore, falling back:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivePolls();
  }, []);

  return (
    <main>
      {/* Hero Section */}
      <section className="hero-home">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Data-driven polling and insights</span>
            <h1>
              Measure opinions. <span>Predict the future.</span>
            </h1>
            <p>
              JOPA Research Africa helps organizations collect reliable data, run
              targeted surveys and polls, visualize findings clearly, and prepare
              reports that support better decisions.
            </p>
            <div className="hero-actions">
              <Link className="btn orange" href="/vote">
                Open voting page <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link className="btn outline light" href="/results">
                View live results
              </Link>
            </div>
            <div className="hero-proof" aria-label="Core capabilities">
              <span>
                <i className="dot" />
                <b>Polling</b> &amp; surveys
              </span>
              <span>
                <i className="dot" />
                <b>Live</b> dashboards
              </span>
              <span>
                <i className="dot" />
                <b>Clear</b> reporting
              </span>
            </div>
          </div>

          <aside className="insight-panel" aria-label="Data dashboard illustration">
            <div className="insight-top">
              <div>
                <span className="small">Insight snapshot</span>
                <h3>Opinion tracking dashboard</h3>
              </div>
              <span className="live-pill">&#9679; Live</span>
            </div>
            <div className="metric-row">
              <div className="metric">
                <small>Responses</small>
                <strong>2,486</strong>
              </div>
              <div className="metric">
                <small>Coverage</small>
                <strong>12 Counties</strong>
              </div>
              <div className="metric">
                <small>Completion</small>
                <strong>89%</strong>
              </div>
            </div>
            <div className="chart-demo" aria-hidden="true">
              <span style={{ height: "42%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "54%" }} />
              <span style={{ height: "88%" }} />
              <span style={{ height: "73%" }} />
              <span style={{ height: "96%" }} />
            </div>
            <div className="chart-note">
              <span>Real-time response trend</span>
              <span>Audited sample</span>
            </div>
          </aside>
        </div>
      </section>

      {/* Services Section */}
      <section className="section" id="services">
        <div className="wrap">
          <div className="section-head split">
            <div>
              <span className="section-kicker">What we do</span>
              <h2>From raw responses to decision-ready insight.</h2>
            </div>
            <p>
              Our work connects rigorous data collection, analytics, visualization,
              and strategic reporting so clients can move from questions to evidence quickly.
            </p>
          </div>
          <div className="services-grid">
            <article className="service-card">
              <span className="service-no">01 / POLLING</span>
              <h3>Opinion Polls &amp; Voting</h3>
              <p>
                Structured polls for public opinion, aspirant preference, stakeholder
                feedback, and targeted civic research.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>

            <article className="service-card">
              <span className="service-no">02 / RESEARCH</span>
              <h3>Surveys &amp; Data Collection</h3>
              <p>
                Questionnaire-based field surveys, community feedback, and
                monitoring and evaluation baseline data collection.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>

            <article className="service-card">
              <span className="service-no">03 / ANALYTICS</span>
              <h3>Data Analysis</h3>
              <p>
                Clean, organize, and rigorously analyze collected datasets to uncover
                patterns, correlations, and demographic trends.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>

            <article className="service-card">
              <span className="service-no">04 / VISUALIZATION</span>
              <h3>Dashboards &amp; Charts</h3>
              <p>
                Interactive and presentation-ready dashboards that make complex
                findings easy to monitor and understand.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>

            <article className="service-card">
              <span className="service-no">05 / REPORTING</span>
              <h3>Strategic Insight Reports</h3>
              <p>
                Clear reports summarizing methodology, visual proof, key drivers,
                and practical recommendations for leaders.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>

            <article className="service-card">
              <span className="service-no">06 / M&amp;E</span>
              <h3>Monitoring &amp; Evaluation</h3>
              <p>
                Ongoing support for tracking program indicators, community feedback,
                and empirical performance metrics.
              </p>
              <span className="service-arrow" aria-hidden="true">&#8599;</span>
            </article>
          </div>
        </div>
      </section>

      {/* Focus Sectors */}
      <section className="section dark" id="sectors">
        <div className="wrap">
          <div className="section-head">
            <span className="section-kicker">Focus sectors</span>
            <h2>Flexible research support across diverse industries.</h2>
            <p>
              The same core research discipline applies across different environments,
              stakeholder groups, and strategic decisions.
            </p>
          </div>
          <div className="sector-grid">
            <article className="sector-item">
              <div className="sector-icon">&#9678;</div>
              <h3>Politics</h3>
              <p>Election polls, aspirant voting, civic sentiment, and campaign insights.</p>
            </article>
            <article className="sector-item">
              <div className="sector-icon">&#9638;</div>
              <h3>Financial Sector</h3>
              <p>Customer feedback, service satisfaction, and branch performance analytics.</p>
            </article>
            <article className="sector-item">
              <div className="sector-icon">&#9825;</div>
              <h3>Health</h3>
              <p>Community health indicators, facility reporting, and patient experience surveys.</p>
            </article>
            <article className="sector-item">
              <div className="sector-icon">&#9651;</div>
              <h3>Education</h3>
              <p>Institutional evaluations, parent feedback, and education program metrics.</p>
            </article>
            <article className="sector-item">
              <div className="sector-icon">&#9671;</div>
              <h3>Sports</h3>
              <p>Fan engagement, league feedback, performance insights, and stakeholder surveys.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Process / Methodology */}
      <section className="section soft">
        <div className="wrap">
          <div className="section-head">
            <span className="section-kicker">How it works</span>
            <h2>A disciplined path from question to evidence.</h2>
          </div>
          <div className="process-grid">
            <article className="process-item">
              <h3>Define the question</h3>
              <p>Clarify target audience, objectives, sampling framework, and key metrics.</p>
            </article>
            <article className="process-item">
              <h3>Collect responses</h3>
              <p>Deploy secure voting, structured surveys, and multi-channel data collection.</p>
            </article>
            <article className="process-item">
              <h3>Analyze the data</h3>
              <p>Review aggregates, confidence intervals, regional breakdowns, and anomalies.</p>
            </article>
            <article className="process-item">
              <h3>Share the insight</h3>
              <p>Deliver interactive live dashboards and clear executive reports ready for action.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Active Polls Section */}
      <section className="section" id="active-polls">
        <div className="wrap">
          <div className="section-head split">
            <div>
              <span className="section-kicker">Live Platform</span>
              <h2>Active Polls &amp; Surveys</h2>
            </div>
            <Link className="btn outline" href="/results">
              Explore All Results
            </Link>
          </div>

          {loading ? (
            <div className="card">
              <p className="small">Loading active polls...</p>
            </div>
          ) : polls.length === 0 ? (
            <div className="card">
              <span className="section-kicker">Status</span>
              <h3>No polls are currently open for public voting.</h3>
              <p className="small">Please check back soon for our next opinion survey.</p>
            </div>
          ) : (
            <div className="polls-grid">
              {polls.map((poll) => (
                <article key={poll.id} className="poll-card">
                  <div>
                    <span className="pill">Active Poll</span>
                    <h3>{poll.name}</h3>
                    <p>{poll.description || "Cast your vote and track live verified returns."}</p>
                  </div>
                  <div className="poll-card-actions">
                    <Link className="btn orange" href={`/vote?poll=${encodeURIComponent(poll.id)}`}>
                      Vote now
                    </Link>
                    <Link className="btn outline" href={`/results?poll=${encodeURIComponent(poll.id)}`}>
                      View Results
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Band */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2>Ready to take part?</h2>
              <p>
                Select your preferred candidates on our secure voting portal or explore
                live returns as votes are tallied.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link className="btn outline light" href="/contact">
                Contact us
              </Link>
              <Link className="btn dark" href="/vote">
                Go to voting &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
