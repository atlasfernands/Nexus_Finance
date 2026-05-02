import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LegalAcceptance, REQUIRED_LEGAL_DOCUMENTS, acceptRequiredLegalDocuments, fetchPrivacyStatus } from "./legal";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: supabaseMock,
}));

function mockSession() {
  supabaseMock.auth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-token",
        user: {
          id: "user-1",
          email: "user@example.com",
          user_metadata: {},
        },
      },
    },
    error: null,
  });
}

function createOrderedSelectResult(data: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));

  return { eq, order, select };
}

describe("legal service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>fallback</html>", {
          headers: { "Content-Type": "text/html" },
          status: 200,
        })
      )
    );
    mockSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to direct Supabase reads when privacy API is unavailable", async () => {
    const acceptances = [
      {
        id: "acceptance-1",
        user_id: "user-1",
        document_type: "terms_of_use",
        document_version: "1.0",
        accepted_at: "2026-05-02T00:00:00.000Z",
      },
    ] satisfies Partial<LegalAcceptance>[];
    const chains = {
      user_legal_acceptances: createOrderedSelectResult(acceptances),
      user_consents: createOrderedSelectResult([]),
      privacy_requests: createOrderedSelectResult([]),
    };

    supabaseMock.from.mockImplementation((table: keyof typeof chains) => chains[table]);

    const status = await fetchPrivacyStatus();

    expect(status.acceptances).toHaveLength(1);
    expect(status.consents).toEqual([]);
    expect(status.privacyRequests).toEqual([]);
    expect(supabaseMock.from).toHaveBeenCalledWith("user_legal_acceptances");
  });

  it("records terms, privacy and user guidelines through direct Supabase fallback", async () => {
    const select = vi.fn(async () => ({ data: [], error: null }));
    const upsert = vi.fn((rows: Array<{ document_type: string; user_id: string }>) => ({ rows, select }));

    supabaseMock.from.mockReturnValue({ upsert });

    await acceptRequiredLegalDocuments();

    const rows = upsert.mock.calls[0]?.[0] ?? [];
    expect(rows.map((row) => row.document_type)).toEqual(REQUIRED_LEGAL_DOCUMENTS);
    expect(rows.every((row) => row.user_id === "user-1")).toBe(true);
  });
});
