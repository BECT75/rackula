import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dualViewSource = readFileSync(
  join(__dirname, "../lib/components/RackDualView.svelte"),
  "utf-8",
);

const sideViewSource = readFileSync(
  join(__dirname, "../lib/components/RackSideView.svelte"),
  "utf-8",
);

describe("desktop rack side elevation", () => {
  it("renders a dedicated SIDE projection in the main rack canvas", () => {
    expect(dualViewSource).toContain('import RackSideView from "./RackSideView.svelte"');
    expect(dualViewSource).toContain('data-testid="rack-side-main"');
    expect(dualViewSource).toContain(">SIDE</div>");
    expect(dualViewSource).toContain("unitHeightPx={U_HEIGHT_PX}");
  });

  it("matches the canvas vertical U scale while keeping the phone canvas compact", () => {
    expect(dualViewSource).toContain('import { U_HEIGHT_PX } from "$lib/constants/layout"');
    expect(dualViewSource).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.rack-side-main\s*\{[\s\S]*?display:\s*none/);
    expect(sideViewSource).toContain("unitHeightPx?: number");
    expect(sideViewSource).toContain("rack.height * safeUnitHeightPx");
    expect(sideViewSource).toContain("background-size: 100% var(--unit-height)");
  });
});
