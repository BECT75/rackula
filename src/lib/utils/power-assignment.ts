import type { PlacedDevice, Rack } from "$lib/types";

export interface CtPowerAssignment {
  pdu_device_id: string;
  outlet_name: string;
}

export function getPowerAssignment(
  device: PlacedDevice,
): CtPowerAssignment | null {
  const raw = device.custom_fields?.ct_power_assignment;
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<CtPowerAssignment>;
  if (
    typeof candidate.pdu_device_id !== "string" ||
    typeof candidate.outlet_name !== "string"
  ) {
    return null;
  }

  return {
    pdu_device_id: candidate.pdu_device_id,
    outlet_name: candidate.outlet_name,
  };
}

export function isPowerOutletOccupied(
  racks: readonly Rack[],
  pduDeviceId: string,
  outletName: string,
  exceptDeviceId?: string,
): boolean {
  for (const rack of racks) {
    for (const device of rack.devices) {
      if (device.id === exceptDeviceId) continue;
      const assignment = getPowerAssignment(device);
      if (
        assignment?.pdu_device_id === pduDeviceId &&
        assignment.outlet_name === outletName
      ) {
        return true;
      }
    }
  }
  return false;
}

export function setPowerAssignment(
  device: PlacedDevice,
  assignment: CtPowerAssignment | null,
): void {
  const customFields = { ...(device.custom_fields ?? {}) };
  if (assignment) {
    customFields.ct_power_assignment = assignment;
  } else {
    delete customFields.ct_power_assignment;
  }
  device.custom_fields = customFields;
}

/**
 * Clear all consumer assignments that point to a PDU being removed.
 * Returns the number of relations cleaned.
 */
export function clearAssignmentsForPdu(
  racks: readonly Rack[],
  pduDeviceId: string,
): number {
  let cleared = 0;
  for (const rack of racks) {
    for (const device of rack.devices) {
      const assignment = getPowerAssignment(device);
      if (assignment?.pdu_device_id !== pduDeviceId) continue;
      setPowerAssignment(device, null);
      cleared += 1;
    }
  }
  return cleared;
}
