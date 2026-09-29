import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand" style={{ color: "#ffffff" }}>
              <span className="logo-mark logo-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>JOPA Research Africa</span>
            </Link>
            <p>
              Data-driven opinion polling, market research, live interactive
              dashboards, and actionable research reporting across Africa.
            </p>
          </div>

          <div>
            <div className="footer-title">Platform</div>
            <div className="footer-links">
              <Link href="/vote">Vote</Link>
              <Link href="/results">Live Results</Link>
              <Link href="/contact">Contact Support</Link>
            </div>
          </div>

          <div>
            <div className="footer-title">Explore</div>
            <div className="footer-links">
              <Link href="/#services">Services</Link>
              <Link href="/#sectors">Sectors</Link>
              <Link href="/#active-polls">Active Polls</Link>
              <Link href="/contact">Project Inquiries</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} JOPA Research Africa. All rights reserved.</span>
          <span>Reliable data, transparent methodology, decision-ready insights.</span>
        </div>
      </div>
    </footer>
  );
}
