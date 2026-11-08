import { describe, expect, it } from "vitest";
import { fromIsoDay, toIsoDay } from "./dates";

describe("toIsoDay", () => {
  it("uses the local day, not the UTC one", () => {
    // 00:30 local on 1 March: in any zone east of UTC that instant is still February in UTC.
    expect(toIsoDay(new Date(2026, 2, 1, 0, 30))).toBe("2026-03-01");
  });

  it("round-trips through fromIsoDay", () => {
    expect(toIsoDay(fromIsoDay("2026-11-08"))).toBe("2026-11-08");
  });
});
