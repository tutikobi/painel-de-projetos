import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, relativeDueLabel } from "./dates.js";

describe("formatDate", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA", () => {
    expect(formatDate("2026-09-05")).toBe("05/09/2026");
  });

  it("devolve texto vazio sem data", () => {
    expect(formatDate(null)).toBe("");
  });
});

describe("relativeDueLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 15, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2026-09-16", "vence hoje"],
    ["2026-09-17", "vence amanhã"],
    ["2026-09-20", "vence em 4 dias"],
    ["2026-09-15", "venceu ontem"],
    ["2026-09-10", "venceu há 6 dias"],
    [null, "sem prazo"],
  ])("%s → %s", (iso, expected) => {
    expect(relativeDueLabel(iso)).toBe(expected);
  });
});
