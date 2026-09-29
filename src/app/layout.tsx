import type { Metadata } from "next";
import "@/styles/globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "JOPA Research Africa | Data-Driven Polling, Research & Visual Dashboards",
  description:
    "JOPA Research Africa helps organizations collect reliable data, run opinion polls and targeted surveys, visualize results in real time, and deliver decision-ready insight reports.",
  keywords: [
    "opinion polling",
    "research Africa",
    "data collection",
    "election polls",
    "survey analytics",
    "dashboards"
  ],
  authors: [{ name: "JOPA Research Africa" }],
  icons: {
    icon: "/assets/favicon.svg"
  },
  openGraph: {
    title: "JOPA Research Africa | Polling, Research & Data Insights",
    description:
      "Reliable opinion polls, research surveys, live interactive dashboards and decision-ready reporting across Africa.",
    type: "website"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
