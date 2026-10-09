import { actionButton, dealButton, expect, startAt, test } from "./fixtures";

/* Phones get a one-screen layout (ADR-0016): nothing scrolls and nothing is clipped. */
for (const [width, height] of [
  [320, 568],
  [360, 640],
  [844, 390],
] as const) {
  test(`a split hand fits a ${width}×${height} screen without scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await startAt(page, { level: 2, seed: 8 });
    await dealButton(page).click();
    await actionButton(page, "Split").click();
    await page.waitForTimeout(600); // let the split cards deal in

    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const felt = document.querySelector(".felt")!.getBoundingClientRect();
      const clipped = [...document.querySelectorAll(".felt .playing-card")].filter((card) => {
        const r = card.getBoundingClientRect();
        return (
          r.top < felt.top || r.bottom > felt.bottom || r.left < felt.left || r.right > felt.right
        );
      }).length;
      return {
        scrollY: doc.scrollHeight - innerHeight,
        scrollX: doc.scrollWidth - innerWidth,
        clipped,
      };
    });
    expect(layout).toEqual({ scrollY: 0, scrollX: 0, clipped: 0 });
    await expect(actionButton(page, "Stand")).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("region", { name: "Coach" })).toBeInViewport({ ratio: 1 });
  });
}
