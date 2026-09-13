"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowIcon } from "@/components/Icons";
import { StatusMessage } from "@/components/StatusMessage";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"error" | "success">("error");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
          website: form.get("website"),
          elapsedMs: Math.round(performance.now()),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Your message could not be sent.");

      formRef.current?.reset();
      setTone("success");
      setMessage("Message sent. We’ll get back to you soon.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Your message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="contact-form" ref={formRef} onSubmit={submit} aria-busy={busy}>
      <div className="contact-fields">
        <label htmlFor="contact-name">
          Your name
          <input id="contact-name" name="name" maxLength={100} autoComplete="name" required />
        </label>
        <label htmlFor="contact-email">
          Your email
          <input
            id="contact-email"
            name="email"
            type="email"
            maxLength={254}
            autoComplete="email"
            inputMode="email"
            required
          />
        </label>
      </div>
      <label htmlFor="contact-message">
        How can we help?
        <textarea id="contact-message" name="message" minLength={10} maxLength={2_000} required />
      </label>
      <label className="contact-honeypot" htmlFor="contact-website" aria-hidden="true">
        Website
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="contact-submit">
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Send your message"} <ArrowIcon />
        </button>
        <span>Private, direct, and never added to a mailing list.</span>
      </div>
      <StatusMessage message={message} tone={tone} />
    </form>
  );
}
