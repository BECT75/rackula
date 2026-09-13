import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const APP_VERSION = "1.0.0-rc.1";
const SCHEMA_VERSION = "1.1";
const PROJECT_NAME = "RACKULA_REFERENCE_PROJECT_V1";
const OUT_DIR = path.resolve(process.cwd(), "qualification");
const YAML_PATH = path.join(OUT_DIR, `${PROJECT_NAME}.rackula.yaml`);
const METRICS_PATH = path.join(OUT_DIR, `${PROJECT_NAME}.metrics.json`);
const MEDIA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

let seq = 1;
const uid = () => `00000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`;
const range = (n, prefix, type, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ name: `${prefix}-${String(i + 1).padStart(2, "0")}`, type, ...extra }));

const shelfSlots = (height) =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `slot-${i + 1}`,
    name: `Slot ${i + 1}`,
    position: { row: 0, col: i },
    width_fraction: 0.25,
    height_units: height,
  }));

const deviceTypes = [
  { slug: "core-switch", manufacturer: "CT Reference", model: "CORE-48", u_height: 1, colour: "#375A7F", category: "network", rack_widths: [19], is_powered: true, interfaces: [...range(12, "RJ45", "10gbase-t"), ...range(4, "SFP", "10gbase-x-sfpp")] },
  { slug: "poe-switch", manufacturer: "CT Reference", model: "POE-48", u_height: 1, colour: "#2E8B57", category: "network", rack_widths: [19], is_powered: true, interfaces: range(16, "Gi", "1000base-t", { poe_mode: "pse", poe_type: "type3-ieee802.3bt" }) },
  { slug: "firewall", manufacturer: "CT Reference", model: "FW-01", u_height: 1, colour: "#8B4513", category: "firewall", rack_widths: [19], is_powered: true, interfaces: [...range(6, "ETH", "1000base-t"), { name: "MGMT", type: "management" }] },
  { slug: "patch-copper", manufacturer: "CT Reference", model: "PP-24", u_height: 1, colour: "#707070", category: "patch-panel", rack_widths: [19], is_powered: false, interfaces: range(16, "RJ45", "1000base-t") },
  { slug: "patch-fiber", manufacturer: "CT Reference", model: "FO-12", u_height: 1, colour: "#A0A0A0", category: "patch-panel", rack_widths: [19], is_powered: false, interfaces: range(12, "SFP", "10gbase-x-sfpp") },
  { slug: "server", manufacturer: "CT Reference", model: "SRV-1U", u_height: 1, colour: "#3A6EA5", category: "server", rack_widths: [19], is_powered: true, interfaces: [...range(4, "ETH", "10gbase-t"), ...range(2, "SFP", "10gbase-x-sfpp")] },
  { slug: "storage", manufacturer: "CT Reference", model: "NAS-2U", u_height: 2, colour: "#486B8A", category: "storage", rack_widths: [19], is_powered: true, is_full_depth: true, interfaces: [...range(4, "ETH", "10gbase-t"), ...range(2, "SFP", "10gbase-x-sfpp")] },
  { slug: "av-matrix", manufacturer: "CT Reference", model: "AV-MX-2U", u_height: 2, colour: "#6A5ACD", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [...range(8, "HDMI-IN", "hdmi", { direction: "input", signal_type: "digital-video-hdmi" }), ...range(8, "HDMI-OUT", "hdmi", { direction: "output", signal_type: "digital-video-hdmi" })] },
  { slug: "hdbaset-tx", manufacturer: "CT Reference", model: "HDBT-TX", u_height: 1, colour: "#7B68EE", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "HDMI-IN", type: "hdmi", direction: "input", signal_type: "digital-video-hdmi" }, { name: "HDBaseT-OUT", type: "1000base-t", direction: "output" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "hdbaset-rx", manufacturer: "CT Reference", model: "HDBT-RX", u_height: 1, colour: "#7B68EE", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "HDBaseT-IN", type: "1000base-t", direction: "input" }, { name: "HDMI-OUT", type: "hdmi", direction: "output", signal_type: "digital-video-hdmi" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "video-processor", manufacturer: "CT Reference", model: "VP-2U", u_height: 2, colour: "#5D4EA6", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [...range(4, "HDMI-IN", "hdmi", { direction: "input", signal_type: "digital-video-hdmi" }), ...range(4, "HDMI-OUT", "hdmi", { direction: "output", signal_type: "digital-video-hdmi" }), ...range(2, "SDI", "sdi-bnc", { signal_type: "digital-video-sdi" })] },
  { slug: "audio-dsp", manufacturer: "CT Reference", model: "DSP-1U", u_height: 1, colour: "#B06060", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [...range(8, "XLR", "xlr-3", { signal_type: "analog-audio-line" }), ...range(4, "DANTE", "dante", { signal_type: "digital-audio-dante" })] },
  { slug: "amplifier", manufacturer: "CT Reference", model: "AMP-2U", u_height: 2, colour: "#9B4F4F", category: "av-media", rack_widths: [19], is_powered: true, is_full_depth: true, interfaces: [...range(4, "XLR-IN", "xlr-3", { direction: "input", signal_type: "analog-audio-line" }), ...range(4, "SPK-OUT", "speakon", { direction: "output", signal_type: "analog-audio-speaker" })] },
  { slug: "dante-io", manufacturer: "CT Reference", model: "DANTE-IO", u_height: 1, colour: "#C07070", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [...range(8, "XLR", "xlr-3", { signal_type: "analog-audio-line" }), ...range(2, "DANTE", "dante", { signal_type: "digital-audio-dante" })] },
  { slug: "control-processor", manufacturer: "CT Reference", model: "CTRL-1U", u_height: 1, colour: "#C08A2E", category: "other", rack_widths: [19], is_powered: true, interfaces: [...range(4, "RS232", "rs-232"), ...range(4, "LAN", "1000base-t"), ...range(4, "GPIO", "other")] },
  { slug: "serial-gateway", manufacturer: "CT Reference", model: "SERIAL-GW", u_height: 1, colour: "#C49A4A", category: "other", rack_widths: [19], is_powered: true, interfaces: [...range(4, "RS232", "rs-232"), ...range(2, "LAN", "1000base-t")] },
  { slug: "pdu", manufacturer: "CT Reference", model: "PDU-1U", u_height: 1, colour: "#454545", category: "power", rack_widths: [19], is_powered: true, interfaces: [{ name: "MGMT", type: "management" }, { name: "LAN", type: "1000base-t" }], power_outlets: range(8, "C13", "other").map(({ name }) => ({ name, type: "IEC-C13" })) },
  { slug: "ups", manufacturer: "CT Reference", model: "UPS-2U", u_height: 2, colour: "#333333", category: "power", rack_widths: [19], is_powered: true, is_full_depth: true, interfaces: [{ name: "MGMT", type: "management" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "shelf-1u", manufacturer: "CT Reference", model: "SHELF-1U", u_height: 1, colour: "#808080", category: "shelf", rack_widths: [19], is_powered: false, slots: shelfSlots(1) },
  { slug: "shelf-2u", manufacturer: "CT Reference", model: "SHELF-2U", u_height: 2, colour: "#808080", category: "shelf", rack_widths: [19], is_powered: false, slots: shelfSlots(2) },
  { slug: "shelf-3u", manufacturer: "CT Reference", model: "SHELF-3U", u_height: 3, colour: "#808080", category: "shelf", rack_widths: [19], is_powered: false, slots: shelfSlots(3) },
  { slug: "user-outlet", manufacturer: "CT Reference", model: "USER-OUTLET", u_height: 0.5, slot_width: 1, colour: "#4F8A8B", category: "other", rack_widths: [19], is_powered: false, interfaces: [{ name: "RJ45-A", type: "1000base-t" }, { name: "RJ45-B", type: "1000base-t" }] },
  { slug: "small-controller", manufacturer: "CT Reference", model: "SMALL-CTRL", u_height: 0.5, slot_width: 1, colour: "#D69E2E", category: "other", rack_widths: [19], is_powered: true, interfaces: [{ name: "LAN-1", type: "1000base-t" }, { name: "LAN-2", type: "1000base-t" }, { name: "RS232", type: "rs-232" }] },
  { slug: "dc-psu", manufacturer: "CT Reference", model: "PSU-DC", u_height: 0.5, slot_width: 1, colour: "#555555", category: "power", rack_widths: [19], is_powered: true, interfaces: [{ name: "DC-OUT", type: "other" }] },
  { slug: "halfwidth-av", manufacturer: "CT Reference", model: "HW-AV", u_height: 1, slot_width: 1, colour: "#7667A8", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "HDMI-IN", type: "hdmi", direction: "input", signal_type: "digital-video-hdmi" }, { name: "HDMI-OUT", type: "hdmi", direction: "output", signal_type: "digital-video-hdmi" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "av-source", manufacturer: "CT Reference", model: "SOURCE", u_height: 0.5, slot_width: 1, colour: "#6E5BAA", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "HDMI-OUT", type: "hdmi", direction: "output", signal_type: "digital-video-hdmi" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "av-display", manufacturer: "CT Reference", model: "DISPLAY", u_height: 0.5, slot_width: 1, colour: "#6E5BAA", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "HDMI-IN", type: "hdmi", direction: "input", signal_type: "digital-video-hdmi" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "small-audio", manufacturer: "CT Reference", model: "AUDIO-IO", u_height: 0.5, slot_width: 1, colour: "#B66A6A", category: "av-media", rack_widths: [19], is_powered: true, interfaces: [{ name: "XLR-IN", type: "xlr-3", signal_type: "analog-audio-line" }, { name: "DANTE", type: "dante", signal_type: "digital-audio-dante" }] },
  { slug: "serial-endpoint", manufacturer: "CT Reference", model: "SERIAL-END", u_height: 0.5, slot_width: 1, colour: "#C18A3A", category: "other", rack_widths: [19], is_powered: true, interfaces: [{ name: "RS232", type: "rs-232" }, { name: "LAN", type: "1000base-t" }] },
  { slug: "remote-endpoint", manufacturer: "CT Reference", model: "REMOTE-END", u_height: 0.5, slot_width: 1, colour: "#5B7E8D", category: "network", rack_widths: [19], is_powered: true, interfaces: [{ name: "LAN", type: "1000base-t" }, { name: "HDMI", type: "hdmi", signal_type: "digital-video-hdmi" }] },
];

const typeBySlug = new Map(deviceTypes.map((t) => [t.slug, t]));
const allPorts = [];
const placementIndex = [];

function instantiatePorts(deviceId, type) {
  return (type.interfaces ?? []).map((iface, index) => {
    const port = {
      id: uid(),
      template_name: iface.name,
      template_index: index,
      type: iface.type,
      ...(iface.direction ? { direction: iface.direction } : {}),
      ...(iface.signal_type ? { signal_type: iface.signal_type } : {}),
    };
    allPorts.push({ ...port, deviceId });
    return port;
  });
}

function place(typeSlug, name, position, face = "front", extra = {}) {
  const type = typeBySlug.get(typeSlug);
  if (!type) throw new Error(`Unknown type ${typeSlug}`);
  const id = uid();
  const placed = {
    id,
    device_type: typeSlug,
    name,
    position,
    face,
    ports: instantiatePorts(id, type),
    notes: `Reference fixture ${name}`,
    custom_fields: {
      qualification_role: type.category,
      depth_mm: type.is_full_depth ? 780 : 320,
    },
    ...extra,
  };
  placementIndex.push(placed);
  return placed;
}

const rackDefs = [
  { name: "RACK-NETWORK-01", depth: 1000, shelves: ["shelf-1u", "shelf-2u"], children: ["user-outlet", "dc-psu"], cycle: ["core-switch", "poe-switch", "firewall", "patch-copper", "patch-fiber", "server", "storage", "pdu", "ups"] },
  { name: "RACK-AV-01", depth: 800, shelves: ["shelf-3u"], children: ["av-source", "av-display"], cycle: ["av-matrix", "hdbaset-tx", "hdbaset-rx", "video-processor", "core-switch", "patch-copper", "server", "pdu"] },
  { name: "RACK-AUDIO-01", depth: 900, shelves: ["shelf-1u"], children: ["small-audio", "dc-psu"], cycle: ["audio-dsp", "amplifier", "dante-io", "core-switch", "patch-copper", "server", "pdu", "ups"] },
  { name: "RACK-CONTROL-01", depth: 650, shelves: ["shelf-2u"], children: ["small-controller", "serial-endpoint"], cycle: ["control-processor", "serial-gateway", "poe-switch", "patch-copper", "server", "pdu", "firewall"] },
  { name: "RACK-REMOTE-01", depth: 600, shelves: ["shelf-3u"], children: ["halfwidth-av", "remote-endpoint"], cycle: ["poe-switch", "patch-copper", "hdbaset-tx", "hdbaset-rx", "audio-dsp", "control-processor", "pdu", "server"] },
];

const racks = rackDefs.map((def, rackIndex) => {
  const devices = [];
  let nextU = 1;
  const addRail = (slug, name, face = "front") => {
    const type = typeBySlug.get(slug);
    const media = devices.length < 2 ? { front_image: MEDIA, rear_image: MEDIA } : {};
    const device = place(slug, name, nextU * 6, face, media);
    devices.push(device);
    nextU += type.u_height;
    return device;
  };

  const regularCount = 28 - def.shelves.length;
  for (let i = 0; i < regularCount; i++) {
    const slug = def.cycle[i % def.cycle.length];
    const face = i === regularCount - 1 ? "rear" : "front";
    addRail(slug, `${def.name}-${slug}-${String(i + 1).padStart(2, "0")}`, face);
  }

  const shelfPlacements = def.shelves.map((slug, i) => addRail(slug, `${def.name}-SHELF-${i + 1}`));
  def.children.forEach((slug, childIndex) => {
    const parent = shelfPlacements[childIndex % shelfPlacements.length];
    const child = place(slug, `${def.name}-${slug}-${childIndex + 1}`, 0, "front", {
      container_id: parent.id,
      slot_id: `slot-${(childIndex % 4) + 1}`,
      ...(rackIndex === 1 ? { front_image: MEDIA, rear_image: MEDIA } : {}),
    });
    devices.push(child);
  });

  if (nextU > 42) throw new Error(`${def.name} exceeds 42U: next U ${nextU}`);

  return {
    id: uid(),
    name: def.name,
    height: 42,
    width: 19,
    desc_units: false,
    show_rear: true,
    form_factor: "4-post-cabinet",
    starting_unit: 1,
    position: rackIndex,
    devices,
    notes: `RACKULA V1 qualification reference rack ${rackIndex + 1}`,
    depth_mm: def.depth,
    base_weight: 50,
  };
});

function findDevice(rackName, slug, occurrence = 0) {
  const rack = racks.find((r) => r.name === rackName);
  const matches = rack.devices.filter((d) => d.device_type === slug);
  const device = matches[occurrence];
  if (!device) throw new Error(`Missing ${rackName}/${slug}/${occurrence}`);
  return device;
}

function findPort(device, templateName) {
  const port = device.ports.find((p) => p.template_name === templateName);
  if (!port) throw new Error(`Missing port ${device.name}/${templateName}`);
  return port;
}

const connections = [];
const usedPorts = new Set();
function connect(a, b, label) {
  if (!a || !b || a.id === b.id) throw new Error(`Invalid connection ${label}`);
  if (usedPorts.has(a.id) || usedPorts.has(b.id)) throw new Error(`Port reused by ${label}`);
  usedPorts.add(a.id);
  usedPorts.add(b.id);
  connections.push({ id: uid(), a_port_id: a.id, b_port_id: b.id, label });
}

const outlet = findDevice("RACK-NETWORK-01", "user-outlet");
const patch = findDevice("RACK-NETWORK-01", "patch-copper");
const poe = findDevice("RACK-NETWORK-01", "poe-switch");
connect(findPort(outlet, "RJ45-A"), findPort(patch, "RJ45-01"), "Permanent link CAT6A - user outlet to patch panel");
connect(findPort(patch, "RJ45-02"), findPort(poe, "Gi-01"), "Patch cord CAT6A - patch panel to PoE switch");

const source = findDevice("RACK-AV-01", "av-source");
const tx = findDevice("RACK-AV-01", "hdbaset-tx");
const rx = findDevice("RACK-AV-01", "hdbaset-rx");
const display = findDevice("RACK-AV-01", "av-display");
connect(findPort(source, "HDMI-OUT"), findPort(tx, "HDMI-IN"), "AV path - HDMI source to HDBaseT transmitter");
connect(findPort(tx, "HDBaseT-OUT"), findPort(rx, "HDBaseT-IN"), "AV path - HDBaseT over CAT6");
connect(findPort(rx, "HDMI-OUT"), findPort(display, "HDMI-IN"), "AV path - HDBaseT receiver to HDMI destination");

const fibers = findDevice("RACK-NETWORK-01", "patch-fiber");
const core = findDevice("RACK-NETWORK-01", "core-switch");
connect(findPort(fibers, "SFP-01"), findPort(core, "SFP-01"), "Fiber uplink - patch tray to core switch");

const portsByType = new Map();
for (const port of allPorts) {
  if (usedPorts.has(port.id)) continue;
  if (!portsByType.has(port.type)) portsByType.set(port.type, []);
  portsByType.get(port.type).push(port);
}

for (const [type, ports] of portsByType) {
  while (ports.length >= 2) {
    const a = ports.shift();
    let bIndex = ports.findIndex((candidate) => candidate.deviceId !== a.deviceId);
    if (bIndex < 0) break;
    const [b] = ports.splice(bIndex, 1);
    connect(a, b, `Reference ${type} link ${connections.length + 1}`);
  }
}

const layout = {
  metadata: {
    id: "00000000-0000-4000-8000-000000000001",
    name: PROJECT_NAME,
    schema_version: SCHEMA_VERSION,
    description: "Golden baseline for RACKULA V1 qualification: 5 racks, 150 devices, shelf children, AV/network/audio/control/power and stable port connections.",
  },
  version: APP_VERSION,
  name: PROJECT_NAME,
  racks,
  device_types: deviceTypes,
  settings: {
    display_mode: "image-label",
    show_labels_on_images: true,
  },
  connections,
};

const allDevices = racks.flatMap((r) => r.devices);
const shelfCount = allDevices.filter((d) => d.device_type.startsWith("shelf-")).length;
const childDevices = allDevices.filter((d) => d.container_id);
const rearMountedCount = allDevices.filter((d) => !d.container_id && d.face === "rear").length;
const idList = [layout.metadata.id, ...racks.map((r) => r.id), ...allDevices.map((d) => d.id), ...allPorts.map((p) => p.id), ...connections.map((c) => c.id)];
const allPortIds = new Set(allPorts.map((p) => p.id));
const uniqueIds = new Set(idList).size === idList.length;
const orphanConnections = connections.filter((c) => !allPortIds.has(c.a_port_id) || !allPortIds.has(c.b_port_id));

const metrics = {
  project: PROJECT_NAME,
  appVersion: APP_VERSION,
  schemaVersion: SCHEMA_VERSION,
  rackCount: racks.length,
  rackNames: racks.map((r) => r.name),
  deviceCount: allDevices.length,
  railDeviceCount: allDevices.length - childDevices.length,
  childDeviceCount: childDevices.length,
  nonRackableCount: childDevices.length,
  shelfCount,
  rearMountedCount,
  portCount: allPorts.length,
  connectionCount: connections.length,
  deviceTypeCount: deviceTypes.length,
  uniqueIds,
  orphanConnectionCount: orphanConnections.length,
  referencePaths: {
    network: "user outlet -> patch panel -> PoE switch",
    av: "HDMI source -> HDBaseT TX -> CAT6 -> HDBaseT RX -> HDMI destination",
  },
};

const requiredRackNames = ["RACK-NETWORK-01", "RACK-AV-01", "RACK-AUDIO-01", "RACK-CONTROL-01", "RACK-REMOTE-01"];
if (metrics.rackCount !== 5) throw new Error(`Expected 5 racks, got ${metrics.rackCount}`);
if (metrics.deviceCount !== 150) throw new Error(`Expected 150 devices, got ${metrics.deviceCount}`);
if (metrics.shelfCount !== 6) throw new Error(`Expected 6 shelves, got ${metrics.shelfCount}`);
if (metrics.nonRackableCount < 10) throw new Error(`Expected >=10 shelf children, got ${metrics.nonRackableCount}`);
if (metrics.rearMountedCount < 3) throw new Error(`Expected >=3 rear devices, got ${metrics.rearMountedCount}`);
if (metrics.portCount < 400) throw new Error(`Expected >=400 ports, got ${metrics.portCount}`);
if (metrics.connectionCount < 200) throw new Error(`Expected >=200 connections, got ${metrics.connectionCount}`);
if (!metrics.uniqueIds) throw new Error("Duplicate stable IDs detected");
if (metrics.orphanConnectionCount !== 0) throw new Error(`Orphan connections: ${metrics.orphanConnectionCount}`);
if (requiredRackNames.some((name) => !metrics.rackNames.includes(name))) throw new Error("Missing required rack name");

fs.mkdirSync(OUT_DIR, { recursive: true });
const body = yaml.dump(layout, { indent: 2, lineWidth: 120, noRefs: true, sortKeys: false, quotingType: '"' });
fs.writeFileSync(YAML_PATH, `# yaml-language-server: $schema=https://count.racku.la/schemas/rackula-layout.schema.json\n${body}`);
fs.writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`);
console.log(JSON.stringify(metrics, null, 2));
