import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

import { sendSlackNotification, sendTeamsNotification } from "@/lib/webhooks";

const testData = {
  ticketNumber: 42,
  subject: "Test Ticket",
  externalToken: "abc123",
  priority: "HIGH",
  status: "OPEN",
  customerName: "Max Muster",
  customerEmail: "max@example.com",
};

describe("webhook notifications", () => {
  beforeEach(() => mockFetch.mockClear());

  it("sends Slack notification for ticket_created", async () => {
    await sendSlackNotification("https://hooks.slack.com/test", "ticket_created", testData);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.blocks).toBeDefined();
  });

  it("sends Teams notification for status_changed", async () => {
    await sendTeamsNotification("https://webhook.office.com/test", "status_changed", testData, {
      oldStatus: "OPEN", newStatus: "RESOLVED"
    });
    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.attachments).toBeDefined();
  });
});
