import { z } from "zod";
import { POSITIONS } from "./types";

const safeText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const pollCreateSchema = z.object({
  name: safeText(120),
  description: z.string().trim().max(500).default(""),
  status: z.enum(["active", "closed"]).default("active"),
});

export const pollUpdateSchema = z.object({
  status: z.enum(["active", "closed", "archived"]),
});

export const aspirantCreateSchema = z.object({
  pollId: safeText(128),
  name: safeText(120),
  position: z.enum(POSITIONS),
  imageUrl: z
    .string()
    .trim()
    .max(2_000)
    .refine(
      (value) => value === "" || /^https:\/\//i.test(value),
      "Image URL must use HTTPS",
    )
    .default(""),
});

export const voteSchema = z.object({
  pollId: safeText(128),
  aspirantId: safeText(128),
});

export const sessionSchema = z.object({ idToken: safeText(10_000) });

export const contactSchema = z.object({
  name: safeText(100),
  email: z.email().trim().max(254),
  message: safeText(2_000).refine((value) => value.length >= 10, "Message is too short"),
  website: z.string().trim().max(200).default(""),
  elapsedMs: z.number().int().nonnegative(),
});
