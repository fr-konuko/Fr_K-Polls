import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getApps: vi.fn(), initializeApp: vi.fn(), getAuth: vi.fn() }));
vi.mock("firebase/app", () => ({ getApps: mocks.getApps, initializeApp: mocks.initializeApp }));
vi.mock("firebase/auth", () => ({ getAuth: mocks.getAuth, initializeAuth: vi.fn(), browserPopupRedirectResolver: {}, inMemoryPersistence: {} }));

import { getClientAuth } from "./client";

describe("administrator Firebase client", () => {
  beforeEach(() => vi.resetAllMocks());

  it("initializes the administrator app when only the voter app exists", () => {
    const app = { name: "[DEFAULT]" };
    mocks.getApps.mockReturnValue([{ name: "voters" }]);
    mocks.initializeApp.mockReturnValue(app);
    getClientAuth();
    expect(mocks.initializeApp).toHaveBeenCalledOnce();
    expect(mocks.getAuth).toHaveBeenCalledWith(app);
  });

  it("reuses the administrator app without selecting voter authentication", () => {
    const app = { name: "[DEFAULT]" };
    mocks.getApps.mockReturnValue([{ name: "voters" }, app]);
    getClientAuth();
    expect(mocks.initializeApp).not.toHaveBeenCalled();
    expect(mocks.getAuth).toHaveBeenCalledWith(app);
  });
});
