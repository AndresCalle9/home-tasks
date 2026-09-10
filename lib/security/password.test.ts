import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { hashActionPassword, verifyActionPassword } = await import("./password");

describe("hashActionPassword / verifyActionPassword", () => {
  it("verifies the correct password against its own hash", () => {
    const hash = hashActionPassword("1234");
    expect(verifyActionPassword("1234", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashActionPassword("1234");
    expect(verifyActionPassword("9999", hash)).toBe(false);
  });

  it("produces a different hash each time (distinct random salts)", () => {
    const a = hashActionPassword("1234");
    const b = hashActionPassword("1234");
    expect(a).not.toEqual(b);
    expect(verifyActionPassword("1234", a)).toBe(true);
    expect(verifyActionPassword("1234", b)).toBe(true);
  });

  it("fails closed on a missing or malformed stored hash", () => {
    expect(verifyActionPassword("1234", null)).toBe(false);
    expect(verifyActionPassword("1234", undefined)).toBe(false);
    expect(verifyActionPassword("1234", "")).toBe(false);
    expect(verifyActionPassword("1234", "not-a-valid-hash")).toBe(false);
  });
});
