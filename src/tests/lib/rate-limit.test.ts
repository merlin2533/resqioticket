import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const key = `test-${Date.now()}`;
    const result = checkRateLimit(key, 5, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests over limit", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key, 5, 60000);
    const result = checkRateLimit(key, 5, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns a resetAt date in the future", () => {
    const key = `test-reset-${Date.now()}`;
    const result = checkRateLimit(key, 5, 60000);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});
