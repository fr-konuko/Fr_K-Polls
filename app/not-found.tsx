import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell page narrow">
      <div className="card empty-state">
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <Link className="button" href="/">Return home</Link>
      </div>
    </main>
  );
}
