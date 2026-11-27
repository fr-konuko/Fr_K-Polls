export type ShareChannel = "share" | "link" | "whatsapp" | "facebook" | "instagram" | "messages" | "email" | "telegram" | "x" | "more";

export function ShareIcon({ channel = "share" }: { channel?: ShareChannel }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {channel === "share" && <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></>}
      {channel === "link" && <><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0) scale(.92)" /></>}
      {channel === "whatsapp" && <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z" /><path d="M8 7.5c-.8 3.8 2.8 7.4 6.5 7.5l1-2-2-1-1 1a7 7 0 0 1-3-3l1-1-1-2Z" /></>}
      {channel === "facebook" && <path d="M14 21v-8h3l.5-3H14V8c0-1 .4-1.5 1.5-1.5H18V3.3C17.2 3.1 16.2 3 15 3c-3 0-5 1.8-5 5v2H7v3h3v8Z" fill="currentColor" stroke="none" />}
      {channel === "instagram" && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>}
      {channel === "messages" && <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H8l-5 2 1.5-5A8.5 8.5 0 1 1 21 11.5ZM8 10h8M8 14h5" />}
      {channel === "email" && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>}
      {channel === "telegram" && <><path d="m3 10 18-7-4 18-6-7-4 3 1-5Z" /><path d="m8 12 9-5-6 7" /></>}
      {channel === "x" && <><path d="M4 3h4l12 18h-4ZM20 3l-7 8M4 21l7-8" /></>}
      {channel === "more" && <>{[5, 12, 19].map((cx) => <circle key={cx} cx={cx} cy="12" r="1.5" fill="currentColor" stroke="none" />)}</>}
    </svg>
  );
}
