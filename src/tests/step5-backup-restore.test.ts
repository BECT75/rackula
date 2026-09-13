import { describe, expect, it } from "vitest";
import type { Layout } from "$lib/types";
import {
  createTestConnection,
  createTestDevice,
  createTestDeviceType,
  createTestLayout,
  createTestPlacedPort,
  createTestRack,
} from "./factories";
import {
  parseLayoutYamlWithImages,
  serializeLayoutToYaml,
} from "$lib/utils/yaml";

const PNG_SIGNATURE_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

describe("Step 5 backup / restore integrity", () => {
  it("round-trips critical project data and embedded images without corruption", async () => {
    const portA = createTestPlacedPort({
      id: "port-source",
      template_name: "LAN A",
      template_index: 0,
      type: "1000base-t",
      direction: "output",
    });
    const portB = createTestPlacedPort({
      id: "port-destination",
      template_name: "LAN B",
      template_index: 0,
      type: "1000base-t",
      direction: "input",
    });

    const deviceA = createTestDevice({
      id: "device-source",
      device_type: "source-device",
      name: "Source Device",
      position: 10,
      ports: [portA],
      notes: "step5-source",
    });
    const deviceB = createTestDevice({
      id: "device-destination",
      device_type: "destination-device",
      name: "Destination Device",
      position: 20,
      ports: [portB],
      notes: "step5-destination",
    });

    const sourceType = createTestDeviceType({
      slug: "source-device",
      manufacturer: "CT",
      model: "Source",
      category: "network",
    });
    const destinationType = createTestDeviceType({
      slug: "destination-device",
      manufacturer: "CT",
      model: "Destination",
      category: "network",
    });

    const sourceLayout = {
      ...createTestLayout({
        metadata: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Step 5 Reference Project",
          schema_version: "1.0",
          description: "Backup/restore acceptance fixture",
        },
        name: "Step 5 Reference Project",
        racks: [
          createTestRack({
            id: "rack-main",
            name: "Main Rack",
            depth_mm: 800,
            devices: [deviceA, deviceB],
          }),
        ],
        device_types: [sourceType, destinationType],
        settings: {
          display_mode: "image-label",
          show_labels_on_images: true,
        },
        connections: [
          createTestConnection({
            id: "connection-main",
            a_port_id: portA.id,
            b_port_id: portB.id,
            label: "Source to destination",
            color: "#336699",
          }),
        ],
      }),
      ct_project: {
        project_code: "STEP5-REFERENCE",
        revision: 5,
      },
    } as Layout & {
      ct_project: { project_code: string; revision: number };
    };

    const serializedImages = {
      "source-device": {
        front: PNG_SIGNATURE_DATA_URL,
      },
    };

    const yaml = await serializeLayoutToYaml(sourceLayout, serializedImages);
    const restored = await parseLayoutYamlWithImages(yaml);

    expect(restored.failedImagesCount).toBe(0);
    expect(restored.failedKeys).toEqual([]);

    const restoredLayout = restored.layout as Layout & {
      ct_project?: { project_code: string; revision: number };
    };

    expect(restoredLayout.name).toBe(sourceLayout.name);
    expect(restoredLayout.metadata).toEqual(sourceLayout.metadata);
    expect(restoredLayout.settings).toEqual(sourceLayout.settings);
    expect(restoredLayout.ct_project).toEqual(sourceLayout.ct_project);

    // Exact rack cardinality is an acceptance invariant for this reference fixture.
    // eslint-disable-next-line no-restricted-syntax -- Step 5 must detect an extra or missing rack after restore.
    expect(restoredLayout.racks).toHaveLength(1);
    expect(restoredLayout.racks[0]?.id).toBe("rack-main");
    expect(restoredLayout.racks[0]?.depth_mm).toBe(800);

    const restoredDevices = restoredLayout.racks[0]?.devices ?? [];
    expect(restoredDevices.map((device) => device.id)).toEqual([
      "device-source",
      "device-destination",
    ]);
    expect(restoredDevices[0]?.position).toBe(deviceA.position);
    expect(restoredDevices[1]?.position).toBe(deviceB.position);
    expect(restoredDevices[0]?.ports).toEqual([portA]);
    expect(restoredDevices[1]?.ports).toEqual([portB]);

    expect(restoredLayout.connections).toEqual(sourceLayout.connections);

    const restoredFront = restored.images.get("source-device")?.front;
    expect(restoredFront?.dataUrl).toBe(PNG_SIGNATURE_DATA_URL);
    expect(restoredFront?.blob?.type).toBe("image/png");
  });
});
