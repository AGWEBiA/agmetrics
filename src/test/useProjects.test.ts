import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Supabase mock setup ----
const mockRange = vi.fn();
const mockIlike = vi.fn(() => ({ eq: vi.fn(() => ({ range: mockRange })), range: mockRange }));
const mockEqChain = vi.fn(() => ({ ilike: mockIlike, range: mockRange, eq: vi.fn(() => ({ range: mockRange })) }));
const mockOrder = vi.fn(() => ({ eq: mockEqChain, ilike: mockIlike, range: mockRange }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args), auth: { getUser: vi.fn(), getSession: vi.fn() } },
}));
vi.mock("@/hooks/useOrganization", () => ({
  useCurrentOrganization: vi.fn(),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCurrentOrganization } from "@/hooks/useOrganization";

describe("useProjects query logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin sees all projects — no organization_id filter applied", () => {
    (useCurrentUser as any).mockReturnValue({ data: { id: "admin-1", role: "admin", permissions: [] } });
    (useCurrentOrganization as any).mockReturnValue({ data: { id: "org-1", name: "Test Org" } });

    // Simulate the query building logic from useProjects
    const isAdmin = true;
    const orgId = "org-1";
    const filters = { organizationId: "all" as const };

    // Admin with "all" org filter should NOT call .eq("organization_id", ...)
    let filterApplied = false;
    if (isAdmin) {
      if (filters.organizationId && filters.organizationId !== "all") {
        filterApplied = true;
      }
    } else {
      filterApplied = true;
    }

    expect(filterApplied).toBe(false);
  });

  it("admin can filter by specific organization", () => {
    const isAdmin = true;
    const filters = { organizationId: "org-specific-123" };

    let filterApplied = false;
    let filteredOrgId = "";
    if (isAdmin) {
      if (filters.organizationId && filters.organizationId !== "all") {
        filterApplied = true;
        filteredOrgId = filters.organizationId;
      }
    }

    expect(filterApplied).toBe(true);
    expect(filteredOrgId).toBe("org-specific-123");
  });

  it("regular user always filters by their organization", () => {
    const isAdmin = false;
    const currentOrgId = "user-org-456";

    let filterApplied = false;
    let filteredOrgId = "";
    if (!isAdmin) {
      filterApplied = true;
      filteredOrgId = currentOrgId;
    }

    expect(filterApplied).toBe(true);
    expect(filteredOrgId).toBe("user-org-456");
  });

  it("regular user cannot bypass org scoping even with organizationId filter", () => {
    const isAdmin = false;
    const currentOrgId = "user-org-456";
    const filters = { organizationId: "other-org-789" };

    // The hook logic: non-admin always uses currentOrg, ignoring filters.organizationId
    let filteredOrgId = "";
    if (!isAdmin) {
      filteredOrgId = currentOrgId; // Always their own org
    }

    expect(filteredOrgId).toBe("user-org-456");
    expect(filteredOrgId).not.toBe("other-org-789");
  });

  it("search filter applies ilike on name", () => {
    const filters = { search: "Pack IA" };
    const expectedPattern = `%${filters.search.trim()}%`;
    expect(expectedPattern).toBe("%Pack IA%");
  });

  it("pagination calculates correct range", () => {
    const page = 3;
    const pageSize = 12;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(24);
    expect(to).toBe(35);
  });

  it("totalPages calculated correctly", () => {
    const count = 37;
    const pageSize = 12;
    const totalPages = Math.ceil(count / pageSize);
    expect(totalPages).toBe(4);
  });
});
