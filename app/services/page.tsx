import type { Metadata } from "next";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <main className="shell page app-page services-page">
      <div className="services-message">
        <span className="overline"><i /> Services</span>
        <h1>Coming soon<span>.</span></h1>
      </div>
    </main>
  );
}