<!--
  ViewControls Component

  The body of the side panel's View tab (#2078): the layout-scoped view toggles
  that are always reachable regardless of selection. Display mode, annotations,
  rear view, and the RACKULA CT side elevation are all projections of the same
  layout state.
-->
<script lang="ts">
  import SegmentedControl from "./SegmentedControl.svelte";
  import Switch from "./Switch.svelte";
  import RackSideView from "./RackSideView.svelte";
  import { getLayoutStore } from "$lib/stores/layout.svelte";
  import { getUIStore } from "$lib/stores/ui.svelte";
  import type { DisplayMode } from "$lib/types";

  const layoutStore = getLayoutStore();
  const uiStore = getUIStore();

  const displayModeOptions: Array<{ value: DisplayMode; label: string }> = [
    { value: "label", label: "Label" },
    { value: "image", label: "Image" },
    { value: "image-label", label: "Image + Label" },
  ];

  const activeRack = $derived(layoutStore.activeRack);

  function handleDisplayModeChange(mode: DisplayMode) {
    if (uiStore.displayMode === mode) return;
    uiStore.setDisplayMode(mode);
    layoutStore.updateDisplayMode(uiStore.displayMode);
    layoutStore.updateShowLabelsOnImages(uiStore.showLabelsOnImages);
  }

  function handleAnnotationsChange(enabled: boolean) {
    uiStore.setAnnotations(enabled);
  }

  function handleRearViewChange(value: string) {
    const rack = activeRack;
    if (!rack) return;
    const showRear = value === "show";
    const group = layoutStore.getRackGroupForRack(rack.id);
    if (group?.layout_preset === "bayed") {
      for (const rackId of group.rack_ids) {
        layoutStore.updateRack(rackId, { show_rear: showRear });
      }
    } else {
      layoutStore.updateRack(rack.id, { show_rear: showRear });
    }
  }
</script>

<div class="view-controls">
  <section class="control-group">
    <h3 class="control-label">Display Mode</h3>
    <SegmentedControl
      options={displayModeOptions}
      value={uiStore.displayMode}
      onchange={handleDisplayModeChange}
      ariaLabel="Display mode"
    />
  </section>

  <section class="control-group">
    <Switch
      id="view-annotations"
      checked={uiStore.showAnnotations}
      label="Annotations"
      helperText="Show the annotation column beside each rack."
      onchange={handleAnnotationsChange}
    />
  </section>

  <section class="control-group">
    <h3 class="control-label">Rear View</h3>
    <SegmentedControl
      options={[
        { value: "show", label: "Show" },
        { value: "hide", label: "Hide" },
      ]}
      value={activeRack?.show_rear ? "show" : "hide"}
      onchange={handleRearViewChange}
      ariaLabel="Show rear view on canvas"
      disabled={!activeRack}
    />
    {#if !activeRack}
      <p class="control-helper">Add a rack to control its rear view.</p>
    {/if}
  </section>

  <section class="control-group" data-testid="ct-side-elevation-section">
    <h3 class="control-label">Side Elevation</h3>
    <p class="control-helper">
      Rack depth, rails and equipment implantation. This projection follows the
      same positions used by the front and rear views.
    </p>
    {#if activeRack}
      <RackSideView rack={activeRack} deviceLibrary={layoutStore.device_types} />
    {:else}
      <p class="control-helper">Add a rack to display its side elevation.</p>
    {/if}
  </section>
</div>

<style>
  .view-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .control-label {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--colour-text);
  }

  .control-helper {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--colour-text-muted);
  }
</style>
