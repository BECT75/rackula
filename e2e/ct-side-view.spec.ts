import { test, expect } from "./helpers/base-test";
import { dragDeviceToRack, gotoWithRack } from "./helpers";

test.describe("RACKULA CT side elevation", () => {
  test("shows rack depth, rails and the same placed equipment", async ({ page }) => {
    await gotoWithRack(page);
    await dragDeviceToRack(page, { view: "front" });

    await page.getByTestId("side-panel-tab-view").click();

    const sideView = page.getByTestId("rack-side-view");
    await expect(sideView).toBeVisible();
    await expect(sideView).toHaveAttribute("aria-label", /depth 1000 millimetres/);
    await expect(page.getByTestId("rack-side-front-rail")).toBeVisible();
    await expect(page.getByTestId("rack-side-rear-rail")).toBeVisible();
    await expect(page.getByTestId("rack-side-device").first()).toBeVisible();
  });
});
