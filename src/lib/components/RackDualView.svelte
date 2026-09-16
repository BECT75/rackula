<!--
  RackDualView Component
  Renders front, rear and desktop side views of a rack
  Replaces single-view Rack with coordinated projections
-->
<script lang="ts">
  import type {
    Rack as RackType,
    DeviceType,
    DeviceFace,
    DisplayMode,
    AnnotationField,
  } from "$lib/types";
  import Rack from "./Rack.svelte";
  import RackSideView from "./RackSideView.svelte";
  import AnnotationColumn from "./AnnotationColumn.svelte";
  import BananaForScale from "./BananaForScale.svelte";
  import RackContextMenu from "./RackContextMenu.svelte";
  import { useLongPress } from "$lib/utils/gestures";
  import { dispatchContextMenuAtPoint } from "$lib/utils/context-menu";
  import { appDebug } from "$lib/utils/debug";
  import { hapticTap } from "$lib/utils/haptics";
  import { getCanvasStore } from "$lib/stores/canvas.svelte";
  import { getPlacementStore } from "$lib/stores/placement.svelte";
  import { U_HEIGHT_PX } from "$lib/constants/layout";

  interface Props {
    rack: RackType;
    deviceLibrary: DeviceType[];
    selected: boolean;
    /** Whether this rack is the active rack (for editing) */
    isActive?: boolean;
    /** ID of the selected device (UUID-based tracking) */
    selectedDeviceId?: string | null;
    displayMode?: DisplayMode;
    showLabelsOnImages?: boolean;
    /** Party mode visual effects active */
    partyMode?: boolean;
    /** Show annotation column */
    showAnnotations?: boolean;
    /** Which field to display in annotation column */
    annotationField?: AnnotationField;
    /** Show banana for scale easter egg */
    showBanana?: boolean;
    /** Enable long press gesture for mobile rack editing */
    enableLongPress?: boolean;
    onselect?: (event: CustomEvent<{ rackId: string }>) => void;
    ondeviceselect?: (
      event: CustomEvent<{
        deviceId?: string;
        slug: string;
        position: number;
        face: "front" | "rear";
      }>,
    ) => void;
    ondevicedrop?: (
      event: CustomEvent<{
        rackId: string;
        slug: string;
        position: number;
        face: "front" | "rear";
      }>,
    ) => void;
    ondevicemove?: (
      event: CustomEvent<{
        rackId: string;
        deviceIndex: number;
        newPosition: number;
      }>,
    ) => void;
    ondevicemoverack?: (
      event: CustomEvent<{
        sourceRackId: string;
        sourceIndex: number;
        targetRackId: string;
        targetPosition: number;
        face: DeviceFace;
      }>,
    ) => void;
    /** Mobile tap-to-place event */
    onplacementtap?: (
      event: CustomEvent<{ position: number; face: "front" | "rear" }>,
    ) => void;
    /** Mobile long press for rack editing */
    onlongpress?: (event: CustomEvent<{ rackId: string }>) => void;
    /** Context menu: export rack callback */
    onexport?: () => void;
    /** Context menu: focus rack callback (pans and zooms canvas to fit this rack) */
    onfocus?: () => void;
    /** Context menu: edit rack callback */
    onedit?: () => void;
    /** Context menu: rename rack callback */
    onrename?: () => void;
    /** Context menu: duplicate rack callback */
    onduplicate?: () => void;
    /** Context menu: delete rack callback */
    ondelete?: () => void;
  }

  let {
    rack,
    deviceLibrary,
    selected,
    isActive = false,
    selectedDeviceId = null,
    displayMode = "label",
    showLabelsOnImages = false,
    partyMode = false,
    showAnnotations = false,
    annotationField = "name",
    showBanana = false,
    enableLongPress = false,
    onselect,
    ondeviceselect,
    ondevicedrop,
    ondevicemove,
    ondevicemoverack,
    onplacementtap,
    onlongpress,
    onexport,
    onfocus,
    onedit,
    onrename,
    onduplicate,
    ondelete,
  }: Props = $props();

  const canvasStore = getCanvasStore();
  const placementStore = getPlacementStore();

  type RackWithPhysicalDimensions = RackType & {
    overall_height_mm?: unknown;
    body_height_mm?: unknown;
    caster_height_mm?: unknown;
    wheel_height_mm?: unknown;
    overall_width_mm?: unknown;
    width_mm?: unknown;
    overall_depth_mm?: unknown;
  };

  function positiveMm(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : null;
  }

  /**
   * Physical dimensions displayed around the desktop projections.
   * Explicit overall dimensions win when present. Legacy layouts fall back to
   * the nominal rack geometry so dimensions remain visible immediately.
   * Caster / wheel height is added only when no explicit overall height exists.
   */
  const rackDimensionsMm = $derived.by(() => {
    const physical = rack as RackWithPhysicalDimensions;
    const casterHeight =
      positiveMm(physical.caster_height_mm) ??
      positiveMm(physical.wheel_height_mm) ??
      0;
    const explicitOverallHeight = positiveMm(physical.overall_height_mm);
    const bodyHeight =
      positiveMm(physical.body_height_mm) ?? Math.round(rack.height * 44.45);
    const width =
      positiveMm(physical.overall_width_mm) ??
      positiveMm(physical.width_mm) ??
      rack.width * 25.4;
    const depth =
      positiveMm(physical.overall_depth_mm) ?? positiveMm(rack.depth_mm) ?? 1000;

    return {
      height: Math.round(explicitOverallHeight ?? bodyHeight + casterHeight),
      width: Math.round(width),
      depth: Math.round(depth),
    };
  });

  // Element reference for long press
  let containerElement: HTMLDivElement | null = $state(null);
  const rackDualLongPressDebug = appDebug.mobile.extend("rack-dual-view");

  // Long press visual feedback state
  let longPressProgress = $state(0);
  let longPressActive = $state(false);
  let longPressPoint = $state<{ x: number; y: number } | null>(null);
  let longPressTarget = $state<Element | null>(null);

  // Attach long press gesture when enabled
  $effect(() => {
    if (!enableLongPress || !containerElement) {
      longPressActive = false;
      longPressProgress = 0;
      longPressPoint = null;
      longPressTarget = null;
      return;
    }

    const cleanup = useLongPress(
      containerElement,
      () => {
        const point = longPressPoint;
        const target = longPressTarget;

        longPressActive = false;
        longPressProgress = 0;
        longPressPoint = null;
        longPressTarget = null;

        if (!point) {
          onlongpress?.(
            new CustomEvent("longpress", { detail: { rackId: rack.id } }),
          );
          return;
        }

        // Device long-press has its own context menu behavior.
        if (target?.closest(".rack-device")) {
          rackDualLongPressDebug(
            "skip rack context menu: device target rackId=%s point=%o",
            rack.id,
            point,
          );
          return;
        }

        hapticTap();
        const fallbackTarget =
          (target?.closest(".rack-dual-view") as Element | null) ??
          containerElement ??
          document.body;
        rackDualLongPressDebug(
          "dispatch rack context menu rackId=%s point=%o hasTarget=%s",
          rack.id,
          point,
          Boolean(target),
        );
        dispatchContextMenuAtPoint(point.x, point.y, fallbackTarget);
      },
      {
        onProgress: (progress) => {
          longPressProgress = progress;
        },
        onStart: (x, y) => {
          longPressActive = true;
          longPressPoint = { x, y };
          longPressTarget = document.elementFromPoint(x, y);
        },
        onCancel: () => {
          longPressActive = false;
          longPressProgress = 0;
          longPressPoint = null;
          longPressTarget = null;
        },
      },
    );

    return cleanup;
  });

  // Now using faceFilter prop instead of virtual racks

  function handleSelect() {
    onselect?.(new CustomEvent("select", { detail: { rackId: rack.id } }));
  }

  function handleKeyDown(event: KeyboardEvent) {
    // During keyboard placement the global handler owns Enter/Space (it places
    // the armed device). Selecting the rack from its own handler here would
    // race that, so defer while placing.
    if (placementStore.isPlacing) return;
    // Only act on keys aimed at the container itself. The listitem holds the
    // rack's interactive device buttons; without this guard a bubbled Enter or
    // Space from a focused device button is preventDefault'd here and selects
    // the rack instead of activating the button.
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  }

  function handleContainerClick(event: MouseEvent) {
    // Clicks on the rack views (front/rear) are handled by the Rack component.
    // Only clicks on the container's own chrome (the rack name and the padding
    // around the views) reach here unhandled. Without this they merely focus
    // the container, whose focus outline is the same colour and weight as the
    // selection outline, so the rack looks selected while the Edit panel stays
    // empty (#2407). Select the rack so the chrome is a real click target,
    // consistent with the keyboard handler above.
    if (
      event.target instanceof Element &&
      event.target.closest(
        '[data-testid="rack-front"], [data-testid="rack-rear"]',
      )
    ) {
      return;
    }
    // Mirror Rack's guards so a post-pan synthetic click or a click during
    // device placement does not select the rack from its chrome.
    if (canvasStore.isPanning || placementStore.isPlacing) return;
    handleSelect();
  }

  // Handle device drop on front view - add face: 'front' to the event
  function handleFrontDeviceDrop(
    event: CustomEvent<{
      rackId: string;
      slug: string;
      position: number;
    }>,
  ) {
    ondevicedrop?.(
      new CustomEvent("devicedrop", {
        detail: {
          ...event.detail,
          face: "front" as const,
        },
      }),
    );
  }

  // Handle device drop on rear view - add face: 'rear' to the event
  function handleRearDeviceDrop(
    event: CustomEvent<{
      rackId: string;
      slug: string;
      position: number;
    }>,
  ) {
    ondevicedrop?.(
      new CustomEvent("devicedrop", {
        detail: {
          ...event.detail,
          face: "rear" as const,
        },
      }),
    );
  }
</script>

<RackContextMenu
  {onexport}
  {onfocus}
  {onedit}
  {onrename}
  {onduplicate}
  {ondelete}
>
  {#snippet trigger(triggerProps)}
    <!-- The rack is a role="listitem" (it holds interactive device buttons, so
         it cannot be a role="option", which forbids focusable descendants:
         nested-interactive, #2255). It stays a click/keyboard focus stop for
         rack-level selection, so the noninteractive-tabindex warning is expected
         here. The context-menu trigger props spread directly onto it (render
         delegation), so there is no roleless wrapper between the canvas list and
         the listitem (aria-required-children, #2254). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      {...triggerProps}
      bind:this={containerElement}
      class="rack-dual-view"
      data-rack-id={rack.id}
      class:selected
      class:active={isActive}
      class:long-press-active={longPressActive}
      tabindex="0"
      role="listitem"
      aria-current={isActive ? "location" : undefined}
      aria-label="{rack.name}, {rack.height}U rack, {rack.show_rear
        ? 'front, rear and side view'
        : 'front and side view'}{isActive ? ', active' : ''}{selected
        ? ', selected'
        : ''}"
      onclick={handleContainerClick}
      onkeydown={handleKeyDown}
      style:--long-press-progress={longPressProgress}
    >
      <!-- Rack name centered above all projections -->
      <div class="rack-dual-view-name">{rack.name}</div>

      <div class="rack-dual-view-container" class:single-view={!rack.show_rear}>
        <!-- Annotation column (left of front view) -->
        {#if showAnnotations}
          <AnnotationColumn {rack} {deviceLibrary} {annotationField} />
        {/if}

        <!-- Front view -->
        <div
          class="rack-front"
          data-testid="rack-front"
          role="presentation"
          style={`--projection-height:${rack.height * U_HEIGHT_PX + 18}px`}
        >
          <Rack
            {rack}
            {deviceLibrary}
            selected={false}
            selectable={false}
            {selectedDeviceId}
            {displayMode}
            {showLabelsOnImages}
            {partyMode}
            faceFilter="front"
            hideRackName={true}
            viewLabel={rack.show_rear ? "FRONT" : undefined}
            onselect={() => handleSelect()}
            {ondeviceselect}
            ondevicedrop={handleFrontDeviceDrop}
            {ondevicemove}
            {ondevicemoverack}
            {onplacementtap}
          />
          <!-- Banana for scale (single view - front panel only) -->
          {#if showBanana && !rack.show_rear}
            <div class="banana-container" aria-hidden="true">
              <BananaForScale />
            </div>
          {/if}

          <div
            class="rack-dimension rack-dimension-horizontal"
            data-testid="rack-width-dimension"
            aria-label={`Overall rack width ${rackDimensionsMm.width} millimetres`}
          >
            <span class="dimension-line" aria-hidden="true"></span>
            <span
              class="dimension-arrow dimension-arrow-horizontal-start"
              aria-hidden="true"
            ></span>
            <span
              class="dimension-arrow dimension-arrow-horizontal-end"
              aria-hidden="true"
            ></span>
            <span class="dimension-value">{rackDimensionsMm.width} mm</span>
          </div>

          <div
            class="rack-dimension rack-dimension-vertical"
            data-testid="rack-height-dimension"
            aria-label={`Overall rack height ${rackDimensionsMm.height} millimetres`}
          >
            <span class="dimension-line" aria-hidden="true"></span>
            <span
              class="dimension-arrow dimension-arrow-vertical-start"
              aria-hidden="true"
            ></span>
            <span
              class="dimension-arrow dimension-arrow-vertical-end"
              aria-hidden="true"
            ></span>
            <span class="dimension-value dimension-value-vertical"
              >{rackDimensionsMm.height} mm</span
            >
          </div>
        </div>

        <!-- Rear view (conditionally shown based on rack.show_rear) -->
        {#if rack.show_rear}
          <div class="rack-rear" data-testid="rack-rear" role="presentation">
            <Rack
              {rack}
              {deviceLibrary}
              selected={false}
              selectable={false}
              {selectedDeviceId}
              {displayMode}
              {showLabelsOnImages}
              {partyMode}
              faceFilter="rear"
              hideRackName={true}
              viewLabel="REAR"
              onselect={() => handleSelect()}
              {ondeviceselect}
              ondevicedrop={handleRearDeviceDrop}
              {ondevicemove}
              {ondevicemoverack}
              {onplacementtap}
            />
            <!-- Banana for scale (dual view - rear panel) -->
            {#if showBanana}
              <div class="banana-container" aria-hidden="true">
                <BananaForScale />
              </div>
            {/if}
          </div>
        {/if}

        <!-- Desktop canvas side elevation. The inspector keeps its compact preview;
             this projection uses the same 22 px/U vertical scale as Rack.svelte so
             FRONT / REAR / SIDE remain visually aligned. Hidden on phone layouts. -->
        <div class="rack-side-main" data-testid="rack-side-main">
          <div class="rack-side-main-label" aria-label="Side view orientation">
            <span>FRONT</span>
            <strong>SIDE</strong>
            <span>REAR</span>
          </div>
          <RackSideView {rack} {deviceLibrary} unitHeightPx={U_HEIGHT_PX} />
          <div
            class="rack-dimension rack-dimension-horizontal"
            data-testid="rack-depth-dimension"
            aria-label={`Overall rack depth ${rackDimensionsMm.depth} millimetres`}
          >
            <span class="dimension-line" aria-hidden="true"></span>
            <span
              class="dimension-arrow dimension-arrow-horizontal-start"
              aria-hidden="true"
            ></span>
            <span
              class="dimension-arrow dimension-arrow-horizontal-end"
              aria-hidden="true"
            ></span>
            <span class="dimension-value">{rackDimensionsMm.depth} mm</span>
          </div>
        </div>

        <!-- Balancing spacer to keep rack centered when annotations are shown -->
        {#if showAnnotations}
          <div class="annotation-spacer" aria-hidden="true"></div>
        {/if}
      </div>
    </div>
  {/snippet}
</RackContextMenu>

<style>
  .rack-dual-view {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: transparent;
    cursor: inherit;
    position: relative; /* For banana positioning */
  }

  .rack-dual-view:focus {
    outline: 2px solid var(--colour-selection);
    outline-offset: 2px;
  }

  .rack-dual-view.selected {
    outline: 2px solid var(--colour-selection);
    outline-offset: 4px;
  }

  .rack-dual-view.active .rack-dual-view-name {
    color: var(--colour-selection);
  }

  /* Long press visual feedback */
  .rack-dual-view.long-press-active {
    outline: 3px solid var(--dracula-pink, #ff79c6);
    outline-offset: 2px;
    /* Progress indicator via box-shadow */
    box-shadow: inset 0 0 0 calc(var(--long-press-progress, 0) * 4px)
      rgba(255, 121, 198, 0.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .rack-dual-view.long-press-active {
      /* Simpler feedback without animation */
      box-shadow: none;
      outline-width: 3px;
    }
  }

  .rack-dual-view-name {
    font-size: var(--font-size-xl);
    font-weight: 500;
    color: var(--colour-text);
    font-family: var(--font-family, system-ui, sans-serif);
    text-align: center;
    margin-bottom: var(--spacing-xs, 4px);
  }

  .rack-dual-view-container {
    display: flex;
    gap: var(--spacing-lg, 24px);
    align-items: flex-start;
  }

  .rack-front,
  .rack-rear,
  .rack-side-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative; /* For banana and dimension positioning */
  }

  .rack-front {
    margin-left: 56px;
  }

  .rack-side-main {
    width: 220px;
    flex: 0 0 220px;
  }

  .rack-side-main-label {
    width: 100%;
    height: 18px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    box-sizing: border-box;
    border: 1px solid var(--colour-border);
    border-bottom: 0;
    background: var(--colour-surface-raised, var(--drawer-bg));
    color: var(--colour-text-muted);
    font-size: var(--font-size-xs);
    letter-spacing: 0.04em;
    padding: 0 6px;
  }

  .rack-side-main-label strong {
    color: var(--colour-text);
    font-weight: var(--font-weight-medium, 500);
  }

  .rack-side-main-label span:last-child {
    text-align: right;
  }

  .rack-side-main :global(.side-view) {
    width: 220px;
    max-width: 220px;
    gap: 0;
  }

  /* The desktop header itself carries FRONT / SIDE / REAR. Removing the compact
     inspector scale is what keeps the SIDE chassis aligned with FRONT and REAR. */
  .rack-side-main :global(.side-view-scale) {
    display: none;
  }

  .rack-dimension {
    color: color-mix(in srgb, var(--colour-text-muted) 88%, transparent);
    font-family: var(--font-family, system-ui, sans-serif);
    font-size: var(--font-size-xs);
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }

  .rack-dimension-horizontal {
    position: relative;
    align-self: stretch;
    height: 34px;
    margin-top: 6px;
    min-width: 100%;
  }

  .rack-dimension-horizontal .dimension-line {
    position: absolute;
    left: 0;
    right: 0;
    top: 17px;
    height: 1px;
    background: currentColor;
  }

  .dimension-arrow {
    position: absolute;
    width: 0;
    height: 0;
  }

  .dimension-arrow-horizontal-start {
    left: 0;
    top: 13px;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-right: 7px solid currentColor;
  }

  .dimension-arrow-horizontal-end {
    right: 0;
    top: 13px;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 7px solid currentColor;
  }

  .dimension-value {
    position: absolute;
    left: 50%;
    top: 17px;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    white-space: nowrap;
    padding: 3px 6px;
    border: 1px solid var(--colour-border);
    border-radius: var(--radius-sm, 3px);
    background: var(--colour-surface-raised, var(--drawer-bg));
    color: var(--colour-text);
    font-weight: var(--font-weight-medium, 500);
  }

  .rack-dimension-vertical {
    position: absolute;
    left: -52px;
    top: 0;
    width: 38px;
    height: var(--projection-height);
  }

  .rack-dimension-vertical .dimension-line {
    position: absolute;
    left: 19px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: currentColor;
  }

  .dimension-arrow-vertical-start {
    left: 15px;
    top: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 7px solid currentColor;
  }

  .dimension-arrow-vertical-end {
    left: 15px;
    bottom: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 7px solid currentColor;
  }

  .dimension-value-vertical {
    left: 19px;
    top: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
  }

  /* Remove individual rack selection styling since we handle it at container level */
  .rack-front :global(.rack-container),
  .rack-rear :global(.rack-container) {
    outline: none !important;
  }

  .rack-front :global(.rack-container:focus),
  .rack-rear :global(.rack-container:focus) {
    outline: none !important;
  }

  /* Keep the primary canvas projections compact on phone layouts. The responsive
     side elevation remains available from the View sheet/panel. */
  @media (max-width: 767px) {
    .rack-side-main,
    .rack-dimension {
      display: none;
    }

    .rack-front {
      margin-left: 0;
    }
  }

  /* Balancing spacer matches annotation column width to keep rack centered */
  .annotation-spacer {
    width: 100px; /* Must match AnnotationColumn default width */
    flex-shrink: 0;
  }

  /* Banana for scale easter egg container */
  .banana-container {
    position: absolute;
    bottom: 0;
    right: -75px;
    pointer-events: none;
  }
</style>
