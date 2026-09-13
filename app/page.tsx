import Link from "next/link";
import { ArrowIcon, CheckIcon } from "@/components/Icons";
import { ContactForm } from "@/components/ContactForm";

const sectors = [
  { number: "01", title: "Politics", copy: "Public opinion, aspirant polling, and campaign signal." },
  { number: "02", title: "Finance", copy: "Customer feedback and branch-level service insight." },
  { number: "03", title: "Health", copy: "Community voice and programme-level feedback." },
  { number: "04", title: "Sports", copy: "Supporter sentiment and performance perspective." },
  { number: "05", title: "Education", copy: "School surveys and programme monitoring." },
];

const previewResults = [
  { name: "Public services", value: 62 },
  { name: "Local economy", value: 24 },
  { name: "Infrastructure", value: 14 },
];

export default function HomePage() {
  return (
    <main>
      <section className="shell home-hero">
        <div className="hero-copy">
          <span className="overline"><i /> Independent polling platform</span>
          <h1>
            Find the signal.
            <span>Lose the noise.</span>
          </h1>
          <p>
            Frk Polls turns focused questions into clear, credible insight—without
            making participation feel like work.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/vote">
              Cast a vote <ArrowIcon />
            </Link>
            <Link className="text-link" href="/results">
              Explore live results <ArrowIcon />
            </Link>
          </div>
          <div className="hero-assurances" aria-label="Platform assurances">
            <span><CheckIcon /> Simple ballots</span>
            <span><CheckIcon /> Position-level voting</span>
            <span><CheckIcon /> Clear live totals</span>
          </div>
        </div>

        <div className="poll-preview" aria-label="Example live poll result">
          <div className="preview-topline">
            <span>Live snapshot</span>
            <strong><i /> Open</strong>
          </div>
          <div className="preview-question">
            <small>Community pulse · 2026</small>
            <h2>What should leaders prioritize next?</h2>
          </div>
          <div className="preview-results">
            {previewResults.map((result, index) => (
              <div className="preview-result" key={result.name}>
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{result.name}</strong>
                  <b>{result.value}%</b>
                </div>
                <div className="preview-track">
                  <i style={{ width: result.value + "%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="preview-foot">
            <span>1,284 responses</span>
            <span>Updated just now</span>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Platform summary">
        <div className="shell signal-grid">
          <div><strong>05</strong><span>focus sectors</span></div>
          <div><strong>10s</strong><span>result refresh</span></div>
          <div><strong>01</strong><span>vote per position</span></div>
        </div>
      </section>

      <section className="shell content-section">
        <div className="section-intro">
          <span className="section-index">01 / Focus</span>
          <div>
            <h2>Built for decisions that matter.</h2>
            <p>
              One calm system for gathering sentiment across the places where
              public voice and institutional action meet.
            </p>
          </div>
        </div>
        <div className="sector-list">
          {sectors.map((sector) => (
            <article className="sector-row" key={sector.title}>
              <span>{sector.number}</span>
              <h3>{sector.title}</h3>
              <p>{sector.copy}</p>
              <i aria-hidden="true">↗</i>
            </article>
          ))}
        </div>
      </section>

      <section className="shell principles">
        <div className="principles-copy">
          <span className="section-index section-index-light">02 / Method</span>
          <h2>Simple by design.</h2>
          <p>
            Every screen removes friction between a question, a response, and the
            decision that follows.
          </p>
          <Link className="button button-light" href="/vote">
            See active polls <ArrowIcon />
          </Link>
        </div>
        <ol className="principle-list">
          <li><span>01</span><div><strong>Choose a poll</strong><p>See only ballots that are currently open.</p></div></li>
          <li><span>02</span><div><strong>Vote by position</strong><p>Make one clear choice in each available race.</p></div></li>
          <li><span>03</span><div><strong>Follow the result</strong><p>Read transparent totals in a view built for clarity.</p></div></li>
        </ol>
      </section>

      <section className="shell contact-section" aria-labelledby="contact-title">
        <div>
          <span className="section-index">03 / Contact</span>
          <h2 id="contact-title">Have a question worth asking?</h2>
        </div>
        <div className="contact-action">
          <p>Let’s talk about your next poll, research project, or partnership.</p>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
