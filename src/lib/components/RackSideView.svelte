<!--
  RACKULA CT side elevation.

  This view reads the same Rack / PlacedDevice state as the front/rear canvas,
  so position changes and save/reload stay coherent without a second placement
  model. Equipment depth is read from the optional CT depth_mm extension (or
  custom_fields.depth_mm), with a fallback based on the existing full-/half-depth flag.
-->
<script lang="ts">
  import type { DeviceType, PlacedDevice, Rack } from "$lib/types";
  import { UNITS_PER_U } from "$lib/types/constants";

  interface Props {
    rack: Rack;
    deviceLibrary: DeviceType[];
  }

  let { rack, deviceLibrary }: Props = $props();

  const rackDepthMm = $derived(rack.depth_mm ?? 1000);
  const rackHeightPx = $derived(Math.max(180, rack.height * 8));
  const maxDepthPx = 220;

  function findType(device: PlacedDevice): DeviceType | undefined {
    return deviceLibrary.find((type) => type.slug === device.device_type);
  }

  function equipmentDepthMm(device: PlacedDevice): number {
    const type = findType(device);
    const extendedDepth = (type as DeviceType & { depth_mm?: unknown })?.depth_mm;
    if (typeof extendedDepth === "number" && extendedDepth > 0) {
      return Math.min(extendedDepth, rackDepthMm);
    }

    const customDepth = type?.custom_fields?.depth_mm;
    if (typeof customDepth === "number" && customDepth > 0) {
      return Math.min(customDepth, rackDepthMm);
    }

    return type?.is_full_depth === false
      ? Math.min(450, Math.round(rackDepthMm * 0.55))
      : rackDepthMm;
  }

  function deviceHeightPx(device: PlacedDevice): number {
    const type = findType(device);
    return Math.max(6, (type?.u_height ?? 1) * 8);
  }

  function deviceBottomPx(device: PlacedDevice): number {
    const positionU = device.position / UNITS_PER_U;
    const type = findType(device);
    const heightU = type?.u_height ?? 1;
    const base = Math.max(0, positionU - 1) * 8;
    if (rack.desc_units) {
      return Math.max(0, rackHeightPx - (base + heightU * 8));
    }
    return base;
  }

  function deviceLeftPx(device: PlacedDevice): number {
    const depthPx = (equipmentDepthMm(device) / rackDepthMm) * maxDepthPx;
    if (device.face === "rear") return maxDepthPx - depthPx;
    return 0;
  }

  function deviceWidthPx(device: PlacedDevice): number {
    return Math.max(12, (equipmentDepthMm(device) / rackDepthMm) * maxDepthPx);
  }

  function label(device: PlacedDevice): string {
    const type = findType(device);
    return device.name ?? type?.model ?? type?.slug ?? "Equipment";
  }

  const visibleDevices = $derived(
    rack.devices.filter((device) => device.container_id === undefined),
  );
</script>

<div
  class="side-view"
  data-testid="rack-side-view"
  aria-label={`Side view of ${rack.name}, depth ${rackDepthMm} millimetres`}
>
  <div class="side-view-scale" aria-hidden="true">
    <span>FRONT</span>
    <span>{rackDepthMm} mm</span>
    <span>REAR</span>
  </div>

  <div
    class="side-elevation"
    style={`--rack-height:${rackHeightPx}px; --rack-depth:${maxDepthPx}px`}
  >
    <div class="rail rail-front" data-testid="rack-side-front-rail"></div>
    <div class="rail rail-rear" data-testid="rack-side-rear-rail"></div>
    <div class="frame frame-top"></div>
    <div class="frame frame-bottom"></div>

    {#each visibleDevices as device (device.id)}
      <div
        class="side-device"
        data-testid="rack-side-device"
        data-device-id={device.id}
        style={`left:${deviceLeftPx(device)}px; width:${deviceWidthPx(device)}px; bottom:${deviceBottomPx(device)}px; height:${deviceHeightPx(device)}px`}
        title={`${label(device)} — ${equipmentDepthMm(device)} mm`}
      >
        <span>{label(device)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .side-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .side-view-scale {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    width: min(100%, 240px);
    font-size: var(--font-size-xs);
    color: var(--colour-text-muted);
  }

  .side-view-scale span:last-child {
    text-align: right;
  }

  .side-elevation {
    position: relative;
    width: var(--rack-depth);
    max-width: 100%;
    height: var(--rack-height);
    min-height: 180px;
    border: 1px solid var(--colour-border);
    background:
      linear-gradient(
        to top,
        color-mix(in srgb, var(--colour-border) 28%, transparent) 1px,
        transparent 1px
      );
    background-size: 100% 8px;
    overflow: hidden;
  }

  .rail {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--colour-text-muted);
    opacity: 0.8;
    z-index: 2;
  }

  .rail-front {
    left: 0;
  }

  .rail-rear {
    right: 0;
  }

  .frame {
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--colour-text-muted);
    opacity: 0.75;
    z-index: 2;
  }

  .frame-top {
    top: 0;
  }

  .frame-bottom {
    bottom: 0;
  }

  .side-device {
    position: absolute;
    display: flex;
    align-items: center;
    min-width: 12px;
    padding: 0 3px;
    border: 1px solid var(--colour-selection);
    background: color-mix(in srgb, var(--colour-selection) 24%, var(--drawer-bg));
    color: var(--colour-text);
    font-size: 9px;
    line-height: 1;
    overflow: hidden;
    z-index: 1;
  }

  .side-device span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
