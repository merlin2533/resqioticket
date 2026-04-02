import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    settings: {
      findUnique: vi.fn(),
    },
    ticket: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { setTicketSla, checkSlaBreach } from "@/lib/sla";
import { prisma } from "@/lib/prisma";

describe("SLA management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when SLA is disabled", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ slaEnabled: false } as never);
    await setTicketSla("ticket-1", "HIGH");
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("sets deadline based on priority when SLA enabled", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      slaEnabled: true, slaHighHours: 24,
    } as never);
    vi.mocked(prisma.ticket.update).mockResolvedValue({} as never);

    await setTicketSla("ticket-1", "HIGH");

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ticket-1" },
        data: expect.objectContaining({ slaBreached: false }),
      })
    );
  });

  it("checkSlaBreach returns 0 when SLA disabled", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ slaEnabled: false } as never);
    const count = await checkSlaBreach();
    expect(count).toBe(0);
  });
});
