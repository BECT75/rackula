import { describe, expect, it } from "vitest";
import type { PlacedDevice, Rack } from "$lib/types";
import {
  clearAssignmentsForPdu,
  getPowerAssignment,
  isPowerOutletOccupied,
  setPowerAssignment,
} from "$lib/utils/power-assignment";

function device(id: string): PlacedDevice {
  return {
    id,
    device_type: "test-device",
    position: 6,
    face: "front",
    ports: [],
    auto_created: false,
  };
}

function rack(devices: PlacedDevice[]): Rack {
  return {
    id: "rack-1",
    name: "Rack 1",
    height: 42,
    width: 19,
    desc_units: false,
    show_rear: true,
    form_factor: "4-post",
    starting_unit: 1,
    position: 0,
    depth_mm: 1000,
    base_weight: 0,
    devices,
  };
}

describe("CT power assignment", () => {
  it("persists an explicit device-to-PDU-outlet relation in custom fields", () => {
    const consumer = device("consumer");

    setPowerAssignment(consumer, {
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 01",
    });

    expect(getPowerAssignment(consumer)).toEqual({
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 01",
    });
    expect(consumer.custom_fields?.ct_power_assignment).toEqual({
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 01",
    });
  });

  it("detects outlet conflicts while allowing the current consumer", () => {
    const first = device("consumer-a");
    const second = device("consumer-b");
    setPowerAssignment(first, {
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 01",
    });
    const racks = [rack([first, second])];

    expect(isPowerOutletOccupied(racks, "pdu-1", "Outlet 01")).toBe(true);
    expect(
      isPowerOutletOccupied(racks, "pdu-1", "Outlet 01", "consumer-a"),
    ).toBe(false);
  });

  it("cleans dependent assignments when a PDU is removed", () => {
    const first = device("consumer-a");
    const second = device("consumer-b");
    setPowerAssignment(first, {
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 01",
    });
    setPowerAssignment(second, {
      pdu_device_id: "pdu-1",
      outlet_name: "Outlet 02",
    });

    expect(clearAssignmentsForPdu([rack([first, second])], "pdu-1")).toBe(2);
    expect(getPowerAssignment(first)).toBeNull();
    expect(getPowerAssignment(second)).toBeNull();
  });
});
