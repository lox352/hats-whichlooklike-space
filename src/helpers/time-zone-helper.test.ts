import { describe, expect, it } from "vitest";
import { utcAtOffset } from "./time-zone-helper";
describe("civil time conversion", () => {
  it("carries the year backwards", () =>
    expect(
      utcAtOffset({ year: 2024, month: 1, day: 1, hour: 0, minute: 15 }, 5.5),
    ).toEqual({ year: 2023, month: 12, day: 31, hour: 18, minute: 45 }));
  it("carries the year forwards", () =>
    expect(
      utcAtOffset(
        { year: 2023, month: 12, day: 31, hour: 23, minute: 45 },
        -3.5,
      ),
    ).toEqual({ year: 2024, month: 1, day: 1, hour: 3, minute: 15 }));
  it("retains leap day", () =>
    expect(
      utcAtOffset({ year: 2024, month: 3, day: 1, hour: 0, minute: 0 }, 1),
    ).toEqual({ year: 2024, month: 2, day: 29, hour: 23, minute: 0 }));
});
