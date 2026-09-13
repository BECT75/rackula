import { describe, expect, it } from "vitest";
import {
  MIDDLE_ATLANTIC_SLIM5_MODELS,
  RACK_CATALOG,
  STARTECH_WALLOA_MODELS,
  findRackCatalogModel,
  rackDefaultsFromCatalogModel,
} from "$lib/data/rackCatalog";

describe("Middle Atlantic Slim 5 rack catalog", () => {
  it("contains the twelve Slim 5 height/depth variants", () => {
    // The current manufacturer matrix is six documented RU heights x two depths.
    // eslint-disable-next-line no-restricted-syntax
    expect(MIDDLE_ATLANTIC_SLIM5_MODELS).toHaveLength(12);
    expect(MIDDLE_ATLANTIC_SLIM5_MODELS.map((model) => model.part_number)).toEqual([
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
    for (const model of MIDDLE_ATLANTIC_SLIM5_MODELS) {
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
      const variants = MIDDLE_ATLANTIC_SLIM5_MODELS.filter(
        (model) => model.height_u === height,
      );
      expect(variants.map((model) => model.depth_in).sort((a, b) => a - b)).toEqual([
        20,
        26,
      ]);
    }
  });
});

describe("StarTech WALLOA wall rack catalog", () => {
  it("contains the six requested wall-rack sizes", () => {
    // This is the current manufacturer family requested for the CT catalog.
    // eslint-disable-next-line no-restricted-syntax
    expect(STARTECH_WALLOA_MODELS).toHaveLength(6);
    expect(STARTECH_WALLOA_MODELS.map((model) => model.height_u)).toEqual([
      8, 12, 15, 18, 21, 24,
    ]);
  });

  it("uses the verified manufacturer SKUs", () => {
    expect(STARTECH_WALLOA_MODELS.map((model) => model.part_number)).toEqual([
      "RK812WALLOA",
      "RK12WALLOA",
      "RK15WALLOA",
      "RACK-18U-20-WALL-OA",
      "RACK-21U-20-WALL-OA",
      "RACK-24U-20-WALL-OA",
    ]);
  });

  it("models the family as 19-inch two-post open-frame wall racks with adjustable 12-20 inch depth", () => {
    for (const model of STARTECH_WALLOA_MODELS) {
      expect(model.manufacturer).toBe("StarTech.com");
      expect(model.mounting_width_in).toBe(19);
      expect(model.rack_type).toBe("2-post");
      expect(model.frame_type).toBe("open-frame");
      expect(model.mounting_style).toBe("wall");
      expect(model.form_factor).toBe("wall-mount");
      expect(model.adjustable_depth).toEqual({
        min_in: 12,
        max_in: 20,
        min_mm: 304.8,
        max_mm: 508,
      });
      expect(model.depth_mm).toBe(508);
    }
  });

  it("resolves a WALLOA SKU and exposes rack defaults", () => {
    const model = findRackCatalogModel("RACK-21U-20-WALL-OA");
    expect(model).toBeDefined();
    expect(rackDefaultsFromCatalogModel(model!)).toEqual({
      height: 21,
      width: 19,
      form_factor: "wall-mount",
      depth_mm: 508,
    });
  });
});

describe("combined rack catalog", () => {
  it("finds entries across manufacturers", () => {
    expect(findRackCatalogModel("5-29-26")?.manufacturer).toBe("Middle Atlantic");
    expect(findRackCatalogModel("RK15WALLOA")?.manufacturer).toBe("StarTech.com");
    expect(RACK_CATALOG.length).toBeGreaterThan(0);
  });
});
