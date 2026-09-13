import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceSameOrigin, HttpError } from "@/lib/http";
import { contactSchema } from "@/lib/validation";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1_000;
const MAX_REQUESTS = 5;
const MAX_BODY_BYTES = 12_000;
const attempts = new Map<string, { count: number; resetsAt: number }>();

function clientAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function enforceRateLimit(request: NextRequest) {
  const now = Date.now();
  const key = clientAddress(request);
  const current = attempts.get(key);

  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + WINDOW_MS });
  } else {
    current.count += 1;
    if (current.count > MAX_REQUESTS) {
      const minutes = Math.ceil((current.resetsAt - now) / 60_000);
      throw new HttpError(429, `Too many messages. Try again in ${minutes} minutes.`);
    }
  }

  if (attempts.size > 5_000) {
    for (const [address, entry] of attempts) {
      if (entry.resetsAt <= now) attempts.delete(address);
    }
  }
}

function requireConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_TO_EMAIL;
  const sender = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !recipient || !sender) {
    throw new HttpError(503, "The contact form is temporarily unavailable.");
  }
  return { apiKey, recipient, sender };
}

export async function POST(request: NextRequest) {
  try {
    enforceSameOrigin(request);
    enforceRateLimit(request);

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) throw new HttpError(413, "Message is too large.");

    const input = contactSchema.parse(await request.json());

    // Return success for obvious automation so bots receive no useful feedback.
    if (input.website || input.elapsedMs < 750) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const { apiKey, recipient, sender } = requireConfiguration();
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": randomUUID(),
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: input.email,
        subject: "New Frk Polls enquiry",
        text: [
          "New website enquiry",
          "",
          `Name: ${input.name}`,
          `Email: ${input.email}`,
          "",
          "Message:",
          input.message,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!providerResponse.ok) {
      console.error("Contact email delivery failed", { status: providerResponse.status });
      throw new HttpError(502, "Your message could not be delivered. Please try again shortly.");
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
