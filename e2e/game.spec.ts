import { actionButton, dealButton, expect, startAt, test } from "./fixtures";

/*
 * Seeds were chosen so the opening hand is the situation under test:
 * seed 8 deals a splittable pair, seed 5 deals a dealer Ace (insurance offer).
 */

test("level 1 highlights the right move and praises following it", async ({ page }) => {
  await startAt(page, { level: 1, seed: 1 });
  await dealButton(page).click();

  // Only Hit and Stand exist at Basics.
  await expect(actionButton(page, "Double")).toHaveCount(0);
  const suggested = page.locator(".btn.is-recommended");
  await expect(suggested).toHaveCount(1);
  const move = (await suggested.innerText()).split(/\s/)[0];

  await suggested.click();
  await expect(page.getByText(`✓ ${move} is right`)).toBeVisible();
});

test("a mistake explains the correct play", async ({ page }) => {
  await startAt(page, { level: 1, seed: 1 });
  await dealButton(page).click();
  const suggested = (await page.locator(".btn.is-recommended").innerText()).split(/\s/)[0];
  const wrong = suggested === "Hit" ? "Stand" : "Hit";

  await actionButton(page, wrong).click();
  await expect(page.getByText(`✗ Basic strategy says ${suggested}`)).toBeVisible();
});

test("the dealer reveals, the hand settles and the bankroll moves", async ({ page }) => {
  await startAt(page, { level: 2, seed: 1 });
  const bankroll = page.locator(".toolbar .bankroll");
  await expect(bankroll).toHaveText("$1,000");

  await dealButton(page).click();
  await actionButton(page, "Stand").click();
  await expect(page.locator(".net-pill")).toBeVisible({ timeout: 10_000 });
  await expect(dealButton(page)).toBeEnabled();
  const net = await page.locator(".net-pill").innerText();
  const expected = net.startsWith("±") ? "$1,000" : net.startsWith("+") ? "$1,010" : "$990";
  await expect(bankroll).toHaveText(expected);
});

test("a pair can be split and both hands are settled", async ({ page }) => {
  await startAt(page, { level: 2, seed: 8 });
  await dealButton(page).click();
  await actionButton(page, "Split").click();

  await expect(page.getByRole("region", { name: /Player hand \d/ })).toHaveCount(2);
  await expect(page.getByText("Playing hand 1 of 2")).toBeVisible();

  for (let i = 0; i < 8; i += 1) {
    const stand = actionButton(page, "Stand");
    if (!(await stand.isVisible()) || !(await stand.isEnabled())) break;
    await stand.click();
  }
  await expect(page.locator(".result-badge")).toHaveCount(2, { timeout: 10_000 });
});

test("insurance is offered against an Ace from level 3", async ({ page }) => {
  await startAt(page, { level: 3, seed: 5 });
  await dealButton(page).click();

  const offer = page.getByRole("group", { name: "Insurance decision" });
  await expect(offer).toBeVisible();
  await offer.getByRole("button", { name: /^No insurance/ }).click();
  await expect(offer).toHaveCount(0);
});

test("a hand in progress survives a reload", async ({ page }) => {
  await startAt(page, { level: 2, seed: 1 });
  await dealButton(page).click();
  const cards = page.getByRole("region", { name: "Player hand" }).getByRole("img");
  const before = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));

  await page.reload();
  await expect(actionButton(page, "Stand")).toBeEnabled();
  const after = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
  expect(after).toEqual(before);
});

test("table rules unlock at level 3 and are printed on the felt", async ({ page }) => {
  await startAt(page, { level: 2, seed: 1 });
  await page.getByRole("button", { name: /^Settings/ }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog.getByRole("radio", { name: "Dealer hits" })).toBeDisabled();

  await dialog.getByRole("button", { name: /Level 3/ }).click();
  await dialog.getByText("Dealer hits").click();
  await dialog.getByRole("button", { name: "Close" }).click();

  await expect(page.locator(".felt-arc")).toContainText("DEALER HITS SOFT 17");
});

test("the strategy chart highlights the current hand", async ({ page }) => {
  await startAt(page, { level: 2, seed: 1 });
  await dealButton(page).click();
  await page.getByRole("button", { name: "Chart" }).click();

  const dialog = page.getByRole("dialog", { name: "Basic strategy" });
  await expect(dialog.locator('td[aria-current="true"]')).toHaveCount(1);
});

test("keyboard shortcuts play a hand", async ({ page, isMobile }) => {
  test.skip(isMobile, "No physical keyboard on phones");
  await startAt(page, { level: 2, seed: 1 });
  await page.keyboard.press("n");
  await expect(actionButton(page, "Stand")).toBeEnabled();
  await page.keyboard.press("s");
  await expect(page.locator(".net-pill")).toBeVisible({ timeout: 10_000 });
});

test("the layout never scrolls sideways", async ({ page }) => {
  await startAt(page, { level: 2, seed: 8 });
  await dealButton(page).click();
  await actionButton(page, "Split").click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
