import { test, expect } from './helpers/base-test';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { loadFileFromDisk, clickSave, clickExport, locators } from './helpers';

const referenceProject = resolve(process.cwd(), 'qualification/RACKULA_REFERENCE_PROJECT_V1.rackula.yaml');
const evidenceFile = resolve(process.cwd(), 'qualification/STEP-6-PERFORMANCE.results.json');

const budgetsMs = {
  openProject: 5000,
  moveEquipment: 500,
  changeView: 1000,
  librarySearch: 1000,
  save: 2000,
  exportDialog: 3000,
  representativeManipulation: 2000,
} as const;

const samples: Record<string, number[]> = {};

async function measure(name: string, fn: () => Promise<void>) {
  const start = performance.now();
  await fn();
  const elapsed = performance.now() - start;
  (samples[name] ??= []).push(Math.round(elapsed * 100) / 100);
  return elapsed;
}

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function writeEvidence() {
  const metrics = Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, {
    samples_ms: values,
    p95_ms: p95(values),
    budget_ms: budgetsMs[name as keyof typeof budgetsMs],
    pass: p95(values) <= budgetsMs[name as keyof typeof budgetsMs],
  }]));
  writeFileSync(evidenceFile, JSON.stringify({
    rc: '1.0.0-rc.1',
    commit: '650e5f6ddc844b02e8f6a91414a1a7e5f8fa1795',
    reference_project: 'RACKULA_REFERENCE_PROJECT_V1',
    method: 'Chromium/Ubuntu GitHub Actions; p95 over repeated user-visible operations',
    budgets_ms: budgetsMs,
    metrics,
  }, null, 2));
}

test.afterAll(() => writeEvidence());

test('Phase 24 step 6 - V1 performance gate on 5 racks / 150 equipment', async ({ page }) => {
  await page.goto('/');

  for (let i = 0; i < 3; i++) {
    if (i > 0) await page.reload();
    await measure('openProject', async () => {
      await loadFileFromDisk(page, referenceProject);
      await expect(page.locator(locators.rackView.dualViewName)).toHaveCount(5, { timeout: 15000 });
      await expect(page.locator(locators.rack.device).first()).toBeVisible({ timeout: 15000 });
    });
  }

  const firstDevice = page.locator(locators.rack.device).first();
  await firstDevice.click();
  for (let i = 0; i < 5; i++) {
    await measure('moveEquipment', async () => {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
      await page.waitForTimeout(50);
    });
  }

  const editTab = page.locator(locators.sidePanel.tabEdit);
  const viewTab = page.locator(locators.sidePanel.tabView);
  await expect(editTab).toBeVisible();
  await expect(viewTab).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await measure('changeView', async () => {
      const target = i % 2 === 0 ? viewTab : editTab;
      await target.click();
      await expect(target).toHaveAttribute('aria-selected', 'true');
    });
  }

  const devicesTab = page.getByTestId('sidebar-tab-devices');
  await devicesTab.click();
  const palette = page.locator(locators.device.palette);
  await expect(palette).toBeVisible();
  const search = palette.getByRole('textbox').first();
  await expect(search).toBeVisible();
  for (const term of ['server', 'switch', 'amplifier', 'processor', 'server']) {
    await measure('librarySearch', async () => {
      await search.fill(term);
      await page.waitForTimeout(50);
    });
  }
  await search.clear();

  for (let i = 0; i < 3; i++) {
    await measure('save', async () => {
      const downloadPromise = page.waitForEvent('download');
      await clickSave(page);
      const download = await downloadPromise;
      await download.path();
    });
  }

  for (let i = 0; i < 3; i++) {
    await measure('exportDialog', async () => {
      await clickExport(page);
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
    });
    await page.keyboard.press('Escape');
  }

  for (let i = 0; i < 3; i++) {
    await measure('representativeManipulation', async () => {
      await devicesTab.click();
      await search.fill('switch');
      await search.clear();
      await firstDevice.click();
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
      await viewTab.click();
      await editTab.click();
    });
  }

  writeEvidence();
  for (const [name, values] of Object.entries(samples)) {
    expect(p95(values), `${name} p95 exceeds V1 budget`).toBeLessThanOrEqual(budgetsMs[name as keyof typeof budgetsMs]);
  }
});
