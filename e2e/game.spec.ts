import { actionButton, dealButton, expect, startAt, test } from "./fixtures";

/*
 * Seeds were chosen so the opening hand is the situation under test:
 * seed 8 deals a splittable pair, seed 5 deals a dealer Ace (insurance offer).
 */

test("a first visit is welcomed until the first decision", async ({ page }) => {
  await startAt(page, { level: 1, seed: 1 });
  const welcome = page.getByText("Learn blackjack one decision at a time");
  await expect(welcome).toBeVisible();

  await dealButton(page).click();
  await page.locator(".btn.is-recommended").click();
  await expect(dealButton(page)).toBeEnabled({ timeout: 10_000 });
  await expect(welcome).toHaveCount(0);
});

test("level 1 highlights the right move and praises following it", async ({ page }) => {
  await startAt(page, { level: 1, seed: 1 });
  await dealButton(page).click();

  // Only Hit and Stand exist at Basics.
  await expect(actionButton(page, "Double")).toHaveCount(0);
  const suggested = page.locator(".btn.is-recommended");
  await expect(suggested).toHaveCount(1);
  const move = (await suggested.innerText()).split(/\s/)[0];

  await suggested.click();
  await expect(page.getByText(`✓ ${move} is right`).filter({ visible: true })).toBeVisible();
});

test("a mistake explains the correct play", async ({ page }) => {
  await startAt(page, { level: 1, seed: 1 });
  await dealButton(page).click();
  const suggested = (await page.locator(".btn.is-recommended").innerText()).split(/\s/)[0];
  const wrong = suggested === "Hit" ? "Stand" : "Hit";

  await actionButton(page, wrong).click();
  // One feedback card is shown per layout (beside the table, or under the moves on phones).
  const feedback = page.getByText(`✗ Basic strategy says ${suggested}`).filter({ visible: true });
  await expect(feedback).toBeVisible();
  await expect(feedback).toBeInViewport();
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

test("cards already on the table never replay the deal animation", async ({ page }) => {
  await startAt(page, { level: 2, seed: 1 });
  await dealButton(page).click();
  await expect(actionButton(page, "Stand")).toBeEnabled();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".playing-card")].every((c) => c.getAnimations().length === 0),
  );

  // Mark the dealt cards, then record which of them animate from here on.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    document
      .querySelectorAll(".playing-card")
      .forEach((card) => card.setAttribute("data-dealt", ""));
    document.addEventListener("animationstart", (event) => {
      if ((event.target as HTMLElement).hasAttribute("data-dealt")) seen.push(event.animationName);
    });
  });

  await actionButton(page, "Stand").click();
  await expect(page.locator(".net-pill")).toBeVisible({ timeout: 10_000 });
  // The hole card's stale deal delay was 330 ms; give any replay time to start.
  await page.waitForTimeout(800);
  // Only the hole card's flip: no card already on the table deals in again.
  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual([
    "flipIn",
  ]);
});

for (const [moves, level, tableOptions] of [
  [4, 2, undefined],
  [
    5,
    3,
    {
      deckCount: 6,
      dealerSoft17: "stand",
      doubleAfterSplit: true,
      surrender: true,
      blackjackPayout: 1.5,
    },
  ],
] as const) {
  test(`every row of ${moves} move buttons is centred`, async ({ page }) => {
    await startAt(page, { level, seed: 1, tableOptions });
    await dealButton(page).click();
    const group = page.getByRole("group", { name: "Your move" });
    await expect(group.locator(".btn")).toHaveCount(moves);

    // Group buttons into rows by their top edge, then compare each row's side gaps.
    const offCentre = await group.locator(".action-buttons").evaluate((row) => {
      const box = row.getBoundingClientRect();
      const rows = new Map<number, DOMRect[]>();
      for (const button of row.children) {
        const rect = button.getBoundingClientRect();
        const top = Math.round(rect.top / 10);
        rows.set(top, [...(rows.get(top) ?? []), rect]);
      }
      return [...rows.values()].map((rects) => {
        const left = Math.min(...rects.map((r) => r.left)) - box.left;
        const right = box.right - Math.max(...rects.map((r) => r.right));
        return Math.round(Math.abs(left - right));
      });
    });
    for (const gap of offCentre) expect(gap).toBeLessThanOrEqual(2);
  });

  test(`the labels of ${moves} move buttons are centred on a 360px phone`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await startAt(page, { level, seed: 1, tableOptions });
    await dealButton(page).click();
    const buttons = page.getByRole("group", { name: "Your move" }).locator(".btn");
    await expect(buttons).toHaveCount(moves);

    const offCentre = await buttons.evaluateAll((els) =>
      els.map((el) => {
        const range = document.createRange();
        range.selectNodeContents(el.firstChild!);
        const text = range.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const gap = Math.abs(text.left - box.left - (box.right - text.right));
        return `${el.firstChild!.textContent}: ${Math.round(gap)}`;
      }),
    );
    for (const entry of offCentre)
      expect(Number(entry.split(": ")[1]), entry).toBeLessThanOrEqual(2);
  });
}
