import type { Metadata } from "next";

const articles = [
  {
    category: "Polling basics",
    readTime: "5 min read",
    title: "A good poll starts before the first question",
    summary:
      "Clear goals, a defined audience, and neutral wording do more for a poll than a long list of questions ever will.",
  },
  {
    category: "Understanding results",
    readTime: "4 min read",
    title: "What a credible result should tell you",
    summary:
      "Percentages are only the beginning. Useful results make the question, the choices, and the context easy to understand.",
  },
  {
    category: "Trust and participation",
    readTime: "6 min read",
    title: "Building trust into digital voting",
    summary:
      "People are more willing to take part when the process feels simple, transparent, and respectful of their time.",
  },
];

export const metadata: Metadata = {
  title: "Our Blog",
  description: "Ideas and practical guides for better polling and clearer decisions.",
};

export default function BlogPage() {
  return (
    <main className="shell page blog-page">
      <header className="blog-intro">
        <span className="overline"><i /> Notes on better questions</span>
        <h1>Our blog<span>.</span></h1>
        <p>
          Practical ideas on polling, participation, and turning community
          perspectives into decisions that matter.
        </p>
      </header>

      <article className="blog-feature">
        <div className="blog-feature-art" aria-hidden="true">
          <span>Field note 01</span>
        </div>
        <div className="blog-feature-copy">
          <div className="blog-meta">
            <span>Featured guide</span>
            <span>6 min read</span>
          </div>
          <h2>Ask better questions. Get more useful answers.</h2>
          <p>
            Strong community insight begins with a focused question. Learn how
            to keep it neutral, make each choice clear, and give people a reason
            to respond.
          </p>
        </div>
      </article>

      <section aria-labelledby="latest-articles">
        <div className="blog-section-heading">
          <h2 id="latest-articles">From the blog</h2>
          <span>Ideas for clearer insight</span>
        </div>
        <div className="blog-list">
          {articles.map((article) => (
            <article className="blog-entry" key={article.title}>
              <div className="blog-meta">
                <span>{article.category}</span>
                <span>{article.readTime}</span>
              </div>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="blog-coming-soon">
        More perspectives and practical guides are on the way.
      </p>
    </main>
  );
}