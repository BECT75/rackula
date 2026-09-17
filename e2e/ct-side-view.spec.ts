import { test, expect } from "./helpers/base-test";
import { dragDeviceToRack, gotoWithRack } from "./helpers";

test.describe("RACKULA CT side elevation", () => {
  test("aligns the desktop side projection and shows physical dimensions", async ({
    page,
  }) => {
    await gotoWithRack(page);
    await dragDeviceToRack(page, { view: "front" });

    const sideProjection = page.getByTestId("rack-side-main");
    const mainSideView = sideProjection.getByTestId("rack-side-view");

    await expect(mainSideView).toBeVisible();
    await expect(mainSideView).toHaveAttribute(
      "aria-label",
      /depth 1000 millimetres/,
    );
    await expect(
      mainSideView.getByTestId("rack-side-front-rail"),
    ).toBeVisible();
    await expect(mainSideView.getByTestId("rack-side-rear-rail")).toBeVisible();
    await expect(
      mainSideView.getByTestId("rack-side-device").first(),
    ).toBeVisible();

    await expect(sideProjection.getByText("FRONT", { exact: true })).toBeVisible();
    await expect(sideProjection.getByText("SIDE", { exact: true })).toBeVisible();
    await expect(sideProjection.getByText("REAR", { exact: true })).toBeVisible();
    await expect(mainSideView.locator(".side-view-scale")).toBeHidden();

    await expect(page.getByTestId("rack-height-dimension")).toContainText(/\d+ mm/);
    await expect(page.getByTestId("rack-width-dimension")).toContainText(/\d+ mm/);
    await expect(page.getByTestId("rack-depth-dimension")).toContainText("1000 mm");

    await page.getByTestId("side-panel-tab-view").click();

    const inspectorSideView = page
      .getByTestId("ct-side-elevation-section")
      .getByTestId("rack-side-view");
    await expect(inspectorSideView).toBeVisible();
  });
});
