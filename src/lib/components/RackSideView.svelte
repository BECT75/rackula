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
    /** Vertical pixels per rack unit. Inspector preview uses 8; canvas uses 22. */
    unitHeightPx?: number;
  }

  let { rack, deviceLibrary, unitHeightPx = 8 }: Props = $props();

  const rackDepthMm = $derived(
    typeof rack.depth_mm === "number" && rack.depth_mm > 0
      ? rack.depth_mm
      : 1000,
  );
  const safeUnitHeightPx = $derived(
    typeof unitHeightPx === "number" && unitHeightPx > 0 ? unitHeightPx : 8,
  );
  const rackHeightPx = $derived(
    Math.max(180, rack.height * safeUnitHeightPx),
  );

  function findType(device: PlacedDevice): DeviceType | undefined {
    return deviceLibrary.find((type) => type.slug === device.device_type);
  }

  function equipmentDepthMm(device: PlacedDevice): number {
    const type = findType(device);
    const extendedDepth = (type as DeviceType & { depth_mm?: unknown })
      ?.depth_mm;
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
    return Math.max(6, (type?.u_height ?? 1) * safeUnitHeightPx);
  }

  function deviceBottomPx(device: PlacedDevice): number {
    const positionU = device.position / UNITS_PER_U;
    const type = findType(device);
    const heightU = type?.u_height ?? 1;
    const base = Math.max(0, positionU - 1) * safeUnitHeightPx;
    if (rack.desc_units) {
      return Math.max(
        0,
        rackHeightPx - (base + heightU * safeUnitHeightPx),
      );
    }
    return base;
  }

  // Horizontal geometry is expressed as a percentage of the rendered rack
  // depth. The side elevation is allowed to shrink below its desktop width on
  // narrow containers, so fixed pixel coordinates would otherwise leave rear
  // devices offset or clipped on mobile.
  function deviceWidthPercent(device: PlacedDevice): number {
    return (equipmentDepthMm(device) / rackDepthMm) * 100;
  }

  function deviceLeftPercent(device: PlacedDevice): number {
    const depthPercent = deviceWidthPercent(device);
    if (device.face === "rear") return 100 - depthPercent;
    return 0;
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
    style={`--rack-height:${rackHeightPx}px; --unit-height:${safeUnitHeightPx}px`}
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
        style={`left:${deviceLeftPercent(device)}%; width:${deviceWidthPercent(device)}%; bottom:${deviceBottomPx(device)}px; height:${deviceHeightPx(device)}px`}
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
    width: min(100%, 220px);
    max-width: 100%;
    min-width: 0;
  }

  .side-view-scale {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-width: 0;
    font-size: var(--font-size-xs);
    color: var(--colour-text-muted);
  }

  .side-view-scale span:last-child {
    text-align: right;
  }

  .side-elevation {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: var(--rack-height);
    min-height: 180px;
    border: 1px solid var(--colour-border);
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--colour-border) 28%, transparent) 1px,
      transparent 1px
    );
    background-size: 100% var(--unit-height);
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
    box-sizing: border-box;
    padding: 0 3px;
    border: 1px solid var(--colour-selection);
    background: color-mix(
      in srgb,
      var(--colour-selection) 24%,
      var(--drawer-bg)
    );
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
