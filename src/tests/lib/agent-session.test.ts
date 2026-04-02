import { describe, it, expect } from "vitest";
import { createAgentToken, verifyAgentToken } from "@/lib/agent-session";

describe("agent session tokens", () => {
  const testData = { agentId: "agent-123", role: "AGENT" as const, name: "Test Agent", email: "test@example.com" };

  it("creates and verifies a valid token", async () => {
    const token = await createAgentToken(testData);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const result = await verifyAgentToken(token);
    expect(result).not.toBeNull();
    expect(result?.agentId).toBe("agent-123");
    expect(result?.role).toBe("AGENT");
    expect(result?.name).toBe("Test Agent");
  });

  it("returns null for invalid token", async () => {
    const result = await verifyAgentToken("invalid-token");
    expect(result).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createAgentToken(testData);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyAgentToken(tampered);
    expect(result).toBeNull();
  });
});
