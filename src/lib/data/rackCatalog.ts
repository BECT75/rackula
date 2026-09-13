import type { FormFactor, RackWidth } from "$lib/types";

export interface AdjustableRackDepth {
  min_in: number;
  max_in: number;
  min_mm: number;
  max_mm: number;
}

/**
 * Manufacturer-backed rack model available to Rackula.
 *
 * Rack models are deliberately separate from DeviceType: a rack is the
 * placement container itself, not a chassis/device placed inside another rack.
 */
export interface RackCatalogModel {
  /** Stable Rackula catalog identifier. */
  id: string;
  /** Manufacturer / commercial brand. */
  manufacturer: string;
  /** Product family or series. */
  series: string;
  /** Manufacturer part number / SKU. */
  part_number: string;
  /** Usable rack height in rack units. */
  height_u: number;
  /** EIA mounting width, not the outside frame width. */
  mounting_width_in: RackWidth;
  /** Manufacturer-published outside frame width. */
  outside_width_in?: number;
  /** Default/catalog depth used by Rackula. */
  depth_in: number;
  /** Exact inch-to-millimetre conversion of depth_in. */
  depth_mm: number;
  /** Optional adjustable mounting-depth range. */
  adjustable_depth?: AdjustableRackDepth;
  /** Product construction details where the manufacturer publishes them. */
  rack_type?: "2-post" | "4-post";
  frame_type?: "open-frame" | "cabinet";
  mounting_style?: "wall" | "floor" | "free-standing";
  /** Rackula form-factor mapping. */
  form_factor: FormFactor;
  /** Official manufacturer product page. */
  product_url: string;
  /** Search aliases used by future rack-library UI. */
  aliases?: string[];
}

const LEGRAND_SLIM5_BASE_URL =
  "https://www.legrandav.com/products/racks/floor_standing/slim_5_rack_frame";
const STARTECH_FR_BASE_URL =
  "https://www.startech.com/fr-fr/gestion-de-serveurs";

const INCH_TO_MM = 25.4;

function slim5(
  partNumber: string,
  heightU: number,
  depthIn: 20 | 26,
): RackCatalogModel {
  return {
    id: `middle-atlantic-slim5-${partNumber.toLowerCase()}`,
    manufacturer: "Middle Atlantic",
    series: "Slim 5",
    part_number: partNumber,
    height_u: heightU,
    // The Slim 5 frame is 19-1/8 in outside width, while installed equipment
    // remains standard 19 in EIA rackmount. Keep those two dimensions distinct.
    mounting_width_in: 19,
    outside_width_in: 19.125,
    depth_in: depthIn,
    depth_mm: depthIn * INCH_TO_MM,
    frame_type: "open-frame",
    mounting_style: "floor",
    form_factor: "open-frame",
    product_url: `${LEGRAND_SLIM5_BASE_URL}/${partNumber.toLowerCase()}`,
    aliases: ["Legrand AV", "Middle Atlantic", "Slim 5", partNumber],
  };
}

function startechWalloa(
  partNumber: string,
  heightU: number,
  productSlug: string,
): RackCatalogModel {
  const minDepthIn = 12;
  const maxDepthIn = 20;

  return {
    id: `startech-walloa-${partNumber.toLowerCase()}`,
    manufacturer: "StarTech.com",
    series: "WALLOA Adjustable Wall Mount",
    part_number: partNumber,
    height_u: heightU,
    mounting_width_in: 19,
    // Rackula uses the maximum mounting depth as the default modeled depth so
    // equipment fit checks never assume less clearance than the rack can provide.
    depth_in: maxDepthIn,
    depth_mm: maxDepthIn * INCH_TO_MM,
    adjustable_depth: {
      min_in: minDepthIn,
      max_in: maxDepthIn,
      min_mm: Number((minDepthIn * INCH_TO_MM).toFixed(1)),
      max_mm: Number((maxDepthIn * INCH_TO_MM).toFixed(1)),
    },
    rack_type: "2-post",
    frame_type: "open-frame",
    mounting_style: "wall",
    form_factor: "wall-mount",
    product_url: `${STARTECH_FR_BASE_URL}/${productSlug}`,
    aliases: [
      "StarTech",
      "StarTech.com",
      "WALLOA",
      "wall mount",
      "open frame",
      partNumber,
    ],
  };
}

/** Middle Atlantic / Legrand AV Slim 5 rack-frame family. */
export const MIDDLE_ATLANTIC_SLIM5_MODELS: readonly RackCatalogModel[] = [
  slim5("5-8", 8, 20),
  slim5("5-8-26", 8, 26),
  slim5("5-14", 14, 20),
  slim5("5-14-26", 14, 26),
  slim5("5-21", 21, 20),
  slim5("5-21-26", 21, 26),
  slim5("5-29", 29, 20),
  slim5("5-29-26", 29, 26),
  slim5("5-37", 37, 20),
  slim5("5-37-26", 37, 26),
  slim5("5-43", 43, 20),
  slim5("5-43-26", 43, 26),
];

/**
 * StarTech.com 19-inch 2-post open-frame wall racks with adjustable 12-20 in
 * mounting depth. StarTech uses two SKU naming conventions across the family.
 */
export const STARTECH_WALLOA_MODELS: readonly RackCatalogModel[] = [
  startechWalloa("RK812WALLOA", 8, "rk812walloa"),
  startechWalloa("RK12WALLOA", 12, "rk12walloa"),
  startechWalloa("RK15WALLOA", 15, "rk15walloa"),
  startechWalloa("RACK-18U-20-WALL-OA", 18, "rack-18u-20-wall-oa"),
  startechWalloa("RACK-21U-20-WALL-OA", 21, "rack-21u-20-wall-oa"),
  startechWalloa("RACK-24U-20-WALL-OA", 24, "rack-24u-20-wall-oa"),
];

/** Built-in rack catalog, grouped by manufacturer family. */
export const RACK_CATALOG: readonly RackCatalogModel[] = [
  ...MIDDLE_ATLANTIC_SLIM5_MODELS,
  ...STARTECH_WALLOA_MODELS,
];

export function findRackCatalogModel(
  partNumber: string,
): RackCatalogModel | undefined {
  const normalized = partNumber.trim().toLowerCase();
  return RACK_CATALOG.find(
    (model) => model.part_number.toLowerCase() === normalized,
  );
}

/** Values that can be applied directly to an existing Rackula Rack. */
export function rackDefaultsFromCatalogModel(model: RackCatalogModel) {
  return {
    height: model.height_u,
    width: model.mounting_width_in,
    form_factor: model.form_factor,
    depth_mm: model.depth_mm,
  } as const;
}
