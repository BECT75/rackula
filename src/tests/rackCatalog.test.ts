import { describe, expect, it } from "vitest";
import {
  RACK_CATALOG,
  findRackCatalogModel,
  rackDefaultsFromCatalogModel,
} from "$lib/data/rackCatalog";

describe("Middle Atlantic Slim 5 rack catalog", () => {
  it("contains the twelve Slim 5 height/depth variants", () => {
    expect(RACK_CATALOG).toHaveLength(12);
    expect(RACK_CATALOG.map((model) => model.part_number)).toEqual([
      "5-8",
      "5-8-26",
      "5-14",
      "5-14-26",
      "5-21",
      "5-21-26",
      "5-29",
      "5-29-26",
      "5-37",
      "5-37-26",
      "5-43",
      "5-43-26",
    ]);
  });

  it("maps manufacturer dimensions to Rackula dimensions without confusing outside and EIA widths", () => {
    for (const model of RACK_CATALOG) {
      expect(model.manufacturer).toBe("Middle Atlantic");
      expect(model.series).toBe("Slim 5");
      expect(model.mounting_width_in).toBe(19);
      expect(model.outside_width_in).toBe(19.125);
      expect(model.form_factor).toBe("open-frame");
      expect(model.depth_mm).toBeCloseTo(model.depth_in * 25.4, 8);
    }
  });

  it("exposes the six supported RU heights at both depths", () => {
    for (const height of [8, 14, 21, 29, 37, 43]) {
      const variants = RACK_CATALOG.filter((model) => model.height_u === height);
      expect(variants.map((model) => model.depth_in).sort((a, b) => a - b)).toEqual([
        20,
        26,
      ]);
    }
  });

  it("resolves a manufacturer part number and returns applicable rack defaults", () => {
    const model = findRackCatalogModel("5-29-26");
    expect(model).toBeDefined();
    expect(model?.depth_mm).toBeCloseTo(660.4, 8);
    expect(rackDefaultsFromCatalogModel(model!)).toEqual({
      height: 29,
      width: 19,
      form_factor: "open-frame",
      depth_mm: 660.4,
    });
  });
});
