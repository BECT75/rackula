import { test, expect } from './helpers/base-test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadFileFromDisk, locators } from './helpers';

const referenceProject = resolve(
  process.cwd(),
  'qualification/RACKULA_REFERENCE_PROJECT_V1.rackula.yaml',
);
const evidenceFile = resolve(
  process.cwd(),
  'qualification/STEP-17-PERFORMANCE.results.json',
);

const thresholdsMs = {
  moveEquipment: 500,
  representativeManipulation: 2000,
} as const;

type MetricName = keyof typeof thresholdsMs;
type MetricSamples = Record<MetricName, number[]>;

const sampleCount = 20;
const warmupCount = 3;
const samples: MetricSamples = {
  moveEquipment: [],
  representativeManipulation: [],
};

async function nextPaint(page: import('@playwright/test').Page) {
  await page.evaluate(
    () => new Promise<void>((resolvePaint) => requestAnimationFrame(() => resolvePaint())),
  );
}

async function prepareReferenceState(page: import('@playwright/test').Page) {
  await page.reload();
  await loadFileFromDisk(page, referenceProject);
  await expect(page.locator(locators.rackView.dualViewName)).toHaveCount(5, {
    timeout: 20_000,
  });
  await expect(page.locator(locators.rack.device).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function timed(operation: () => Promise<void>) {
  const start = performance.now();
  await operation();
  return Math.round((performance.now() - start) * 100) / 100;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) throw new Error('Cannot calculate a percentile without samples');
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[index];
}

function writeEvidence() {
  const metrics = Object.fromEntries(
    (Object.keys(samples) as MetricName[]).map((name) => {
      const values = samples[name];
      const p50 = percentile(values, 0.5);
      const p95 = percentile(values, 0.95);
      return [
        name,
        {
          samples_ms: values,
          sample_count: values.length,
          p50_ms: p50,
          p95_ms: p95,
          threshold_ms: thresholdsMs[name],
          pass: p95 <= thresholdsMs[name],
        },
      ];
    }),
  );

  const allPass = Object.values(metrics).every((metric) => metric.pass);
  mkdirSync(resolve(process.cwd(), 'qualification'), { recursive: true });
  writeFileSync(
    evidenceFile,
    `${JSON.stringify(
      {
        step: 17,
        version: process.env.npm_package_version ?? 'unknown',
        commit: process.env.GITHUB_SHA ?? 'local',
        reference_project: 'RACKULA_REFERENCE_PROJECT_V1',
        reference_load: { racks: 5, equipment: 150, ports: 1249, connections: 616 },
        historical_reference: {
          source: 'Phase 24 Step 6 / 1.0.0-rc.1',
          moveEquipment_p95_ms: 728.8,
          representativeManipulation_p95_ms: 3182.27,
        },
        method: {
          browser: 'Chromium via Playwright',
          runner_os: process.env.RUNNER_OS ?? process.platform,
          runner_arch: process.env.RUNNER_ARCH ?? process.arch,
          sample_count: sampleCount,
          warmup_count: warmupCount,
          statistic: 'p50 and nearest-rank p95',
          note: 'Maintenance reference on a pinned GitHub-hosted Windows runner; this is a reproducible technical reference and is not represented as physical pilot hardware.',
        },
        thresholds_ms: thresholdsMs,
        gate_status: allPass ? 'PASS' : 'FAIL',
        metrics,
      },
      null,
      2,
    )}\n`,
  );
}

test.afterAll(() => {
  if (samples.moveEquipment.length > 0 && samples.representativeManipulation.length > 0) {
    writeEvidence();
  }
});

test('Step 17 - requalify the two accepted Step 6 P2 deviations', async ({ page }) => {
  await page.goto('/');
  await loadFileFromDisk(page, referenceProject);
  await expect(page.locator(locators.rackView.dualViewName)).toHaveCount(5, {
    timeout: 20_000,
  });

  const firstDevice = page.locator(locators.rack.device).first();
  await expect(firstDevice).toBeVisible();
  await firstDevice.focus();

  for (let i = 0; i < warmupCount; i += 1) {
    await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
    await nextPaint(page);
  }

  for (let i = 0; i < sampleCount; i += 1) {
    samples.moveEquipment.push(
      await timed(async () => {
        await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
        await nextPaint(page);
        await expect(firstDevice).toBeVisible();
      }),
    );
  }

  await prepareReferenceState(page);
  const devicesTab = page.getByTestId('sidebar-tab-devices');
  const search = page.getByTestId('search-devices');
  const viewTab = page.locator(locators.sidePanel.tabView);
  const editTab = page.locator(locators.sidePanel.tabEdit);

  const representativeOperation = async (iteration: number) => {
    await devicesTab.click();
    await expect(search).toBeVisible();
    await search.fill('switch');
    await page.waitForTimeout(175);
    await search.clear();
    await page.waitForTimeout(175);
    await firstDevice.focus();
    await page.keyboard.press(iteration % 2 === 0 ? 'ArrowUp' : 'ArrowDown');
    await viewTab.click();
    await editTab.click();
    await nextPaint(page);
  };

  for (let i = 0; i < warmupCount; i += 1) {
    await representativeOperation(i);
  }

  for (let i = 0; i < sampleCount; i += 1) {
    samples.representativeManipulation.push(
      await timed(async () => representativeOperation(i)),
    );
  }

  writeEvidence();

  const moveP95 = percentile(samples.moveEquipment, 0.95);
  const manipulationP95 = percentile(samples.representativeManipulation, 0.95);

  expect(
    moveP95,
    `moveEquipment p95 ${moveP95} ms exceeds original Step 6 budget`,
  ).toBeLessThanOrEqual(thresholdsMs.moveEquipment);
  expect(
    manipulationP95,
    `representativeManipulation p95 ${manipulationP95} ms exceeds original Step 6 budget`,
  ).toBeLessThanOrEqual(thresholdsMs.representativeManipulation);
});
