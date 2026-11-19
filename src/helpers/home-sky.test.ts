import { describe, expect, it } from "vitest";
import { freshDesign, homeOf } from "./home-sky";
import { designFromSearchParams, designToSearchParams } from "./design-url";

describe("a new sky", () => {
  it("is over the biggest place in the browser's time zone", () => {
    expect(homeOf("Pacific/Auckland").place[0]).toBe("Auckland");
    expect(homeOf("America/New_York").place[0]).toBe("New York City");
    expect(homeOf("Australia/Sydney").place[0]).toBe("Sydney");
  });

  it("falls back on London where the zone is unknown", () => {
    expect(homeOf("Mars/Olympus_Mons").place[0]).toBe("London");
    expect(homeOf(undefined).zone).toBe("Europe/London");
  });

  it("is a night and a place, now, not a bare point", () => {
    const { design, label } = freshDesign("Europe/Paris", new Date(2026, 10, 19, 21, 30));
    expect(design.source?.moment).toEqual({ year: 2026, month: 11, day: 19, hour: 21, minute: 30 });
    expect(design.source?.zone).toBe("Europe/Paris");
    expect(label).toBe("Paris, Île-de-France, France");
    expect(design.orientation.targetDestination).toBe("crown");
  });

  it("travels in its link as a night and a place", () => {
    const { design } = freshDesign("Europe/Paris", new Date(2026, 10, 19, 21, 30));
    const back = designFromSearchParams(designToSearchParams(design));
    expect(back.source).toEqual(design.source);
  });
});
