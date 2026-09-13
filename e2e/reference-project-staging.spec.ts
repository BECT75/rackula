import { test, expect } from './helpers/base-test';
import { resolve } from 'node:path';
import { loadFileFromDisk, clickSave, locators } from './helpers';

const referenceProject = resolve(
  process.cwd(),
  'qualification/RACKULA_REFERENCE_PROJECT_V1.rackula.yaml',
);

const expectedRackNames = [
  'RACK-NETWORK-01',
  'RACK-AV-01',
  'RACK-AUDIO-01',
  'RACK-CONTROL-01',
  'RACK-REMOTE-01',
];

test.describe('RACKULA_REFERENCE_PROJECT_V1', () => {
  test('loads, renders 5 racks and survives save/reopen', async ({ page }) => {
    await page.goto('/');
    await loadFileFromDisk(page, referenceProject);
    await expect(page.locator(locators.toast.success).first()).toBeVisible({ timeout: 15000 });

    const rackHeaders = page.locator(locators.rackView.dualViewName);
    await expect(rackHeaders).toHaveCount(5);
    const beforeRackNames = await rackHeaders.allTextContents();
    expect(beforeRackNames).toEqual(expectedRackNames);
    await expect(page.locator(locators.rack.device).first()).toBeVisible({ timeout: 15000 });

    const downloadPromise = page.waitForEvent('download');
    await clickSave(page);
    const download = await downloadPromise;
    const savedPath = test.info().outputPath('RACKULA_REFERENCE_PROJECT_V1-roundtrip.rackula.yaml');
    await download.saveAs(savedPath);

    await page.reload();
    await loadFileFromDisk(page, savedPath);
    await expect(page.locator(locators.toast.success).first()).toBeVisible({ timeout: 15000 });
    const afterRackNames = await page.locator(locators.rackView.dualViewName).allTextContents();
    expect(afterRackNames).toEqual(beforeRackNames);
    await expect(page.locator(locators.rack.device).first()).toBeVisible({ timeout: 15000 });
  });
});
