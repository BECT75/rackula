/**
 * Regression coverage for the mobile RackSideView geometry.
 *
 * The side elevation can shrink below its desktop width on narrow screens. Its
 * device depth geometry therefore has to stay proportional to the rendered
 * rack width instead of being calculated from fixed pixel offsets.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "../lib/components/RackSideView.svelte"),
  "utf-8",
);

describe("RackSideView responsive geometry", () => {
  it("uses percentage-based horizontal device geometry", () => {
    expect(source).toContain("function deviceWidthPercent");
    expect(source).toContain("function deviceLeftPercent");
    expect(source).toContain("left:${deviceLeftPercent(device)}%");
    expect(source).toContain("width:${deviceWidthPercent(device)}%");
    expect(source).not.toContain("const maxDepthPx = 220");
    expect(source).not.toContain("deviceLeftPx");
    expect(source).not.toContain("deviceWidthPx");
  });

  it("lets the side view shrink to its mobile container", () => {
    expect(source).toContain("width: min(100%, 220px)");
    expect(source).toContain("max-width: 100%");
    expect(source).toMatch(/\.side-elevation\s*{[^}]*width:\s*100%/s);
    expect(source).toMatch(/\.side-view-scale\s*{[^}]*width:\s*100%/s);
  });

  it("keeps device borders and padding inside percentage widths", () => {
    expect(source).toMatch(/\.side-device\s*{[^}]*box-sizing:\s*border-box/s);
  });
});
