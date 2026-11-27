"use client";

import { useId, useRef, useState } from "react";
import { ShareIcon, type ShareChannel } from "@/components/ShareIcon";

export function PollVoteLink({ pollId, pollName = "this poll" }: { pollId: string; pollName?: string }) {
  const [shareUrl, setShareUrl] = useState("");
  const [smsPrefix, setSmsPrefix] = useState("sms:?body=");
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const panelId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const href = `/vote?poll=${encodeURIComponent(pollId)}`;
  const title = `Vote in ${pollName} · JR Africa`;
  const text = `${title}: ${shareUrl}`;

  function openShare() {
    setShareUrl(new URL(href, window.location.origin).href);
    setSmsPrefix(/iPad|iPhone|iPod/.test(navigator.userAgent) ? "sms:&body=" : "sms:?body=");
    setMessage("");
    dialog.current?.showModal();
  }

  async function copyLink(forInstagram = false) {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
      setMessage(forInstagram ? "Link copied. Paste it into an Instagram message, story link, or bio." : "Voting link copied.");
    } catch {
      linkInput.current?.focus();
      linkInput.current?.select();
      setMessage("Select and copy the voting link above, then paste it into your app.");
    }
  }

  async function shareWithApps(forInstagram = false) {
    if (!navigator.share) {
      if (forInstagram) await copyLink(true);
      else setMessage("Your browser does not offer an app share menu. Choose an option here or copy the link.");
      return;
    }
    setSharing(true);
    setMessage("");
    try {
      await navigator.share({ title, text: title, url: new URL(href, window.location.origin).href });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setMessage("Could not open your app share menu. Use Copy link to share in your preferred app.");
      }
    } finally {
      setSharing(false);
    }
  }

  const channels: { name: string; icon: ShareChannel; href?: string; external?: boolean }[] = [
    { name: "WhatsApp", icon: "whatsapp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, external: true },
    { name: "Facebook", icon: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, external: true },
    { name: "Instagram", icon: "instagram" },
    { name: "Messages", icon: "messages", href: `${smsPrefix}${encodeURIComponent(text)}` },
    { name: "Email", icon: "email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}` },
    { name: "Telegram", icon: "telegram", href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, external: true },
    { name: "X", icon: "x", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, external: true },
    { name: "More apps", icon: "more" },
  ];

  return (
    <div className="poll-share">
      <div>
        <strong>Share this poll</strong>
        <p>Send the direct voting link to your community.</p>
      </div>
      <button ref={trigger} type="button" className="button-secondary" aria-haspopup="dialog" aria-controls={panelId} onClick={openShare}><ShareIcon /> Share poll</button>
      <dialog ref={dialog} id={panelId} className="poll-share-dialog" aria-labelledby={`${panelId}-title`} onClose={() => trigger.current?.focus()} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
      }}>
        <header className="poll-share-dialog-header">
          <div>
            <h2 id={`${panelId}-title`}>Share this poll</h2>
            <p>{pollName}</p>
          </div>
          <button type="button" className="poll-share-close" aria-label="Close share panel" onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="poll-share-channels">
          {channels.map((channel) => {
            const content = <><span className={`share-channel-icon share-channel-${channel.icon}`}><ShareIcon channel={channel.icon} /></span><span>{channel.name}</span></>;
            return channel.href ? (
              <a className="share-channel" key={channel.icon} href={channel.href} target={channel.external ? "_blank" : undefined} rel={channel.external ? "noopener noreferrer" : undefined}>{content}</a>
            ) : (
              <button type="button" className="share-channel" key={channel.icon} disabled={sharing} onClick={() => shareWithApps(channel.icon === "instagram")}>{content}</button>
            );
          })}
        </div>
        <label className="poll-share-link-label" htmlFor={`${panelId}-link`}>Or copy the voting link</label>
        <div className="poll-share-copy-row">
          <ShareIcon channel="link" />
          <input ref={linkInput} id={`${panelId}-link`} type="text" value={shareUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="button-secondary" onClick={() => copyLink()}>Copy link</button>
        </div>
        <p className="poll-share-help">Instagram uses your device’s share menu, or copies the link to paste into a message.</p>
        <p className="poll-share-message" role="status">{message}</p>
      </dialog>
    </div>
  );
}
