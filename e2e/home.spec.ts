import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The BFF is answered by a route mock: the join with the real BFF runs in the reference scenario.
async function mockBff(page: Page, status = 200) {
  await page.route("**/v1/greetings/*", (route) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.split("/").pop() ?? "");
    return status === 200 ? route.fulfill({ status, json: { message: `Hello, ${name}` } }) : route.fulfill({ status, json: { code: "unavailable" } });
  });
}

test.describe("home page", () => {
  test("has no WCAG 2.2 AA violations on the home page", async ({ page }) => {
    await mockBff(page);
    await page.goto("/");
    await expect(page.getByText("Hello, ana")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("has no WCAG 2.2 AA violations in the error state", async ({ page }) => {
    await mockBff(page, 503);
    await page.goto("/");
    await expect(page.getByText("The greeting could not be loaded")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test("reaches the field, submit and retry by keyboard in order", async ({ page }) => {
    await mockBff(page, 503);
    await page.goto("/");
    await expect(page.getByText("The greeting could not be loaded")).toBeVisible();
    const order: string[] = [];
    // the first Tab lands on the navigation links; walk until the field, then record the next stops
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const label = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.id === "name" ? "field" : el?.tagName === "BUTTON" ? (el.textContent ?? "") : "";
      });
      if (label) order.push(label);
    }
    expect(order.slice(0, 3)).toEqual(["field", "Greet", "Try again"]);
  });
});
