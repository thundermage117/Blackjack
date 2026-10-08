import { actionButton, dealButton, expect, startAt, test } from "./fixtures";

test("the web app manifest makes the trainer installable", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: "Blackjack Trainer",
    short_name: "Blackjack",
    start_url: "/",
    display: "standalone",
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
    true,
  );

  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(`/${icon.src}`);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});

test("after one visit the trainer loads and plays offline", async ({ page, context }) => {
  await startAt(page, { level: 1, seed: 1 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  // Any asset missing from the precache would fail to load and log a console error,
  // which fails the test through the shared fixture.
  await page.reload();
  await expect(page.getByRole("region", { name: "Blackjack table" })).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await dealButton(page).click();
  await expect(actionButton(page, "Stand")).toBeVisible();
  await actionButton(page, "Stand").click();
  await expect(page.locator(".net-pill")).toBeVisible({ timeout: 10_000 });
});
