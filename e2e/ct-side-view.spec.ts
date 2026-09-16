import { test, expect } from "./helpers/base-test";
import { dragDeviceToRack, gotoWithRack } from "./helpers";

test.describe("RACKULA CT side elevation", () => {
  test("shows rack depth, rails and the same placed equipment", async ({
    page,
  }) => {
    await gotoWithRack(page);
    await dragDeviceToRack(page, { view: "front" });

    const mainSideView = page
      .getByTestId("rack-side-main")
      .getByTestId("rack-side-view");
    await expect(mainSideView).toBeVisible();
    await expect(mainSideView).toHaveAttribute(
      "aria-label",
      /depth 1000 millimetres/,
    );
    await expect(mainSideView.getByTestId("rack-side-front-rail")).toBeVisible();
    await expect(mainSideView.getByTestId("rack-side-rear-rail")).toBeVisible();
    await expect(mainSideView.getByTestId("rack-side-device").first()).toBeVisible();

    await page.getByTestId("side-panel-tab-view").click();

    const inspectorSideView = page
      .getByTestId("ct-side-elevation-section")
      .getByTestId("rack-side-view");
    await expect(inspectorSideView).toBeVisible();
  });
});
