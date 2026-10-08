import { test as base, expect, type Page } from "@playwright/test";

/** Every test fails if the page logs an error or throws. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Opens the app at a learning level with a seeded shoe. The level is written to
 * storage once per test, so reloads keep whatever the test did afterwards.
 */
export async function startAt(
  page: Page,
  options: { level: 1 | 2 | 3 | 4; seed: number; tableOptions?: Record<string, unknown> },
) {
  const save = { level: options.level, tableOptions: options.tableOptions };
  await page.addInitScript((save) => {
    if (sessionStorage.getItem("e2e-seeded")) return;
    localStorage.setItem("blackjack.session.v2", JSON.stringify(save));
    sessionStorage.setItem("e2e-seeded", "1");
  }, save);
  await page.goto(`/?seed=${options.seed}`);
  await expect(page.getByRole("region", { name: "Blackjack table" })).toBeVisible();
}

export const actionButton = (page: Page, name: string) =>
  page
    .getByRole("group", { name: "Your move" })
    .getByRole("button", { name: new RegExp(`^${name}`) });

export const dealButton = (page: Page) =>
  page.getByRole("button", { name: /^(Deal|Next Hand|Shuffle & Deal)/ });
