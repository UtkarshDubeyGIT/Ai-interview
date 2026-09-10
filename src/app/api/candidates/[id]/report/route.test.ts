import { beforeEach, expect, it, vi } from "vitest";
const { ownedCandidate, sql, createReport } = vi.hoisted(() => ({
  ownedCandidate: vi.fn(),
  sql: vi.fn(),
  createReport: vi.fn(),
}));
vi.mock("@/server/ownership", () => ({ ownedCandidate }));
vi.mock("@/server/db", () => ({ db: () => sql }));
vi.mock("@/server/reports", () => ({ createReport }));
import { POST } from "./route";
beforeEach(() => {
  vi.resetAllMocks();
  createReport.mockResolvedValue(undefined);
});
it("allows an owner to reassess a completed report", async () => {
  ownedCandidate.mockResolvedValue({ status: "completed" });
  sql.mockResolvedValue([{ id: "candidate-1" }]);
  const response = await POST(new Request("http://localhost"), {
    params: Promise.resolve({ id: "candidate-1" }),
  });
  expect(response.status).toBe(202);
  expect(createReport).toHaveBeenCalledWith("candidate-1");
});
it("does not generate twice when a competing request already claimed the report", async () => {
  ownedCandidate.mockResolvedValue({ status: "report_failed" });
  sql.mockResolvedValue([]);
  const response = await POST(new Request("http://localhost"), {
    params: Promise.resolve({ id: "candidate-1" }),
  });
  expect(response.status).toBe(409);
  expect(createReport).not.toHaveBeenCalled();
});
it("does not regenerate another owner's report", async () => {
  ownedCandidate.mockResolvedValue(null);
  expect(
    (
      await POST(new Request("http://localhost"), {
        params: Promise.resolve({ id: "candidate-1" }),
      })
    ).status,
  ).toBe(409);
  expect(sql).not.toHaveBeenCalled();
});
