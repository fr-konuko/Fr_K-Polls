import { describe, expect, it } from "vitest";
import {
  aspirantCreateSchema,
  contactSchema,
  pollCreateSchema,
  voteSchema,
} from "./validation";

describe("request validation", () => {
  it("normalizes poll input", () => {
    expect(
      pollCreateSchema.parse({
        name: "  County poll  ",
        description: "  Public opinion  ",
        position: "Senator",
      }),
    ).toEqual({
      name: "County poll",
      description: "Public opinion",
      position: "Senator",
      status: "draft",
    });
  });

  it("rejects non-HTTPS candidate images", () => {
    expect(() =>
      aspirantCreateSchema.parse({
        pollId: "poll-1",
        name: "A Candidate",
        position: "Senator",
        imageUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("requires both vote identifiers", () => {
    expect(() => voteSchema.parse({ pollId: "", aspirantId: "candidate-1" })).toThrow();
  });

  it("normalizes valid contact messages", () => {
    expect(
      contactSchema.parse({
        name: "  Jane Doe  ",
        email: "jane@example.com",
        message: "  I would like to discuss a community poll.  ",
        website: "",
        elapsedMs: 1_000,
      }),
    ).toMatchObject({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "I would like to discuss a community poll.",
    });
  });

  it("rejects invalid contact details", () => {
    expect(() =>
      contactSchema.parse({
        name: "Jane",
        email: "not-an-email",
        message: "Too short",
        website: "",
        elapsedMs: 1_000,
      }),
    ).toThrow();
  });
});
