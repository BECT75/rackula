import type { FormFactor, RackWidth } from "$lib/types";

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
  /** Manufacturer-published nominal frame depth. */
  depth_in: number;
  /** Exact inch-to-millimetre conversion of depth_in. */
  depth_mm: number;
  /** Rackula form-factor mapping. */
  form_factor: FormFactor;
  /** Official manufacturer product page. */
  product_url: string;
  /** Search aliases used by future rack-library UI. */
  aliases?: string[];
}

const LEGRAND_SLIM5_BASE_URL =
  "https://www.legrandav.com/products/racks/floor_standing/slim_5_rack_frame";

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
    form_factor: "open-frame",
    product_url: `${LEGRAND_SLIM5_BASE_URL}/${partNumber.toLowerCase()}`,
    aliases: ["Legrand AV", "Middle Atlantic", "Slim 5", partNumber],
  };
}

/**
 * Built-in rack catalog.
 *
 * Middle Atlantic Slim 5 is offered in six RU heights at two nominal depths,
 * giving twelve manufacturer SKUs. The ordering groups each height's 20 in and
 * 26 in variants together for predictable UI presentation.
 */
export const RACK_CATALOG: readonly RackCatalogModel[] = [
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
