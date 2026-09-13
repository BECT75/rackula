<!--
  EditPanelActions Component
  Device power assignment and destructive actions for the selected device.
-->
<script lang="ts">
  import EditPanelPower from "./EditPanelPower.svelte";
  import { getLayoutStore } from "$lib/stores/layout.svelte";
  import { getSelectionStore } from "$lib/stores/selection.svelte";
  import { getToastStore } from "$lib/stores/toast.svelte";
  import { isCustomDevice } from "$lib/utils/device-lookup";
  import type { SelectedDeviceInfo } from "$lib/types";

  interface Props {
    selectedDeviceInfo: SelectedDeviceInfo;
    ondeletetype?: () => void;
  }

  let { selectedDeviceInfo, ondeletetype }: Props = $props();

  const layoutStore = getLayoutStore();
  const selectionStore = getSelectionStore();
  const toastStore = getToastStore();

  const isSelectedDeviceCustom = $derived.by(() =>
    isCustomDevice(selectedDeviceInfo.device.slug),
  );

  function handleRemoveDevice() {
    const name = layoutStore.removeDeviceFromRack(
      selectedDeviceInfo.rack.id,
      selectedDeviceInfo.deviceIndex,
    );
    selectionStore.clearSelection();
    if (name) {
      toastStore.showUndoToast(`Removed ${name}`, () => layoutStore.undo());
    }
  }
</script>

<EditPanelPower {selectedDeviceInfo} />

<div class="actions">
  <button
    type="button"
    class="btn-remove"
    onclick={handleRemoveDevice}
    aria-label="Remove from rack"
  >
    Remove from Rack
  </button>
  {#if isSelectedDeviceCustom}
    <button
      type="button"
      class="btn-delete-type"
      onclick={() => ondeletetype?.()}
      aria-label="Delete from library"
    >
      Delete from Library
    </button>
  {/if}
</div>

<style>
  .actions {
    margin-top: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .btn-remove {
    align-self: flex-start;
    padding: var(--space-1-5) var(--space-3);
    background: transparent;
    border: 1px solid var(--colour-error);
    border-radius: var(--radius-sm);
    color: var(--colour-error);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color var(--duration-fast),
      color var(--duration-fast);
  }

  .btn-remove:hover {
    background: var(--colour-error-bg);
  }

  .btn-delete-type {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--colour-error);
    border: 1px solid var(--colour-error);
    border-radius: var(--radius-sm);
    color: var(--colour-text-inverse);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: background-color var(--duration-fast);
  }

  .btn-delete-type:hover {
    background: var(--colour-error-hover);
  }
</style>
