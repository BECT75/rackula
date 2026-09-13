<!-- RACKULA CT power/PDU assignment for a selected placed device. -->
<script lang="ts">
  import { getLayoutStore } from "$lib/stores/layout.svelte";
  import {
    getPowerAssignment,
    isPowerOutletOccupied,
    setPowerAssignment,
  } from "$lib/utils/power-assignment";
  import type { SelectedDeviceInfo } from "$lib/types";

  interface Props {
    selectedDeviceInfo: SelectedDeviceInfo;
  }

  let { selectedDeviceInfo }: Props = $props();
  const layoutStore = getLayoutStore();
  let error = $state("");

  const currentAssignment = $derived(
    getPowerAssignment(selectedDeviceInfo.placedDevice),
  );

  const outletOptions = $derived.by(() => {
    const options: Array<{
      value: string;
      label: string;
      pduDeviceId: string;
      outletName: string;
    }> = [];

    for (const rack of layoutStore.racks) {
      for (const placed of rack.devices) {
        if (placed.id === selectedDeviceInfo.placedDevice.id) continue;
        const type = layoutStore.device_types.find(
          (candidate) => candidate.slug === placed.device_type,
        );
        if (!type?.power_outlets?.length) continue;

        const pduLabel = placed.name ?? type.model ?? type.slug;
        for (const outlet of type.power_outlets) {
          options.push({
            value: `${placed.id}::${outlet.name}`,
            label: `${pduLabel} — ${outlet.name}`,
            pduDeviceId: placed.id,
            outletName: outlet.name,
          });
        }
      }
    }

    return options;
  });

  const selectedValue = $derived(
    currentAssignment
      ? `${currentAssignment.pdu_device_id}::${currentAssignment.outlet_name}`
      : "",
  );

  function applyAssignment(value: string) {
    error = "";

    if (!value) {
      setPowerAssignment(selectedDeviceInfo.placedDevice, null);
      layoutStore.markDirty();
      return;
    }

    const option = outletOptions.find((candidate) => candidate.value === value);
    if (!option) {
      error = "The selected PDU outlet is no longer available.";
      return;
    }

    if (
      isPowerOutletOccupied(
        layoutStore.racks,
        option.pduDeviceId,
        option.outletName,
        selectedDeviceInfo.placedDevice.id,
      )
    ) {
      error = "This PDU outlet is already assigned to another device.";
      return;
    }

    setPowerAssignment(selectedDeviceInfo.placedDevice, {
      pdu_device_id: option.pduDeviceId,
      outlet_name: option.outletName,
    });
    layoutStore.markDirty();
  }
</script>

<section class="power-assignment" data-testid="ct-power-assignment">
  <h3>Power / PDU</h3>
  <label for="ct-power-outlet">Assigned outlet</label>
  <select
    id="ct-power-outlet"
    data-testid="ct-power-outlet-select"
    value={selectedValue}
    onchange={(event) => applyAssignment(event.currentTarget.value)}
  >
    <option value="">Not assigned</option>
    {#each outletOptions as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if outletOptions.length === 0}
    <p class="helper">
      Add a placed device type with power outlets to assign power.
    </p>
  {:else}
    <p class="helper">
      One device per PDU outlet. The assignment is saved with the project.
    </p>
  {/if}
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</section>

<style>
  .power-assignment {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--colour-border);
  }

  h3 {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
  }

  label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  select {
    width: 100%;
    min-height: 36px;
    padding: var(--space-2);
    border: 1px solid var(--colour-border);
    border-radius: var(--radius-sm);
    background: var(--input-bg);
    color: var(--colour-text);
  }

  .helper,
  .error {
    margin: 0;
    font-size: var(--font-size-xs);
  }

  .helper {
    color: var(--colour-text-muted);
  }

  .error {
    color: var(--colour-error);
  }
</style>
