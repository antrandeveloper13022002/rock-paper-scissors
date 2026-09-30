import { test, expect } from '@playwright/test';

// Collects page errors so every test can assert the app ran cleanly.
function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function startNpcMatch(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /chơi với máy/i }).click();
  await page.getByRole('button', { name: /tiếp tục ›/i }).click();
  await page.getByRole('button', { name: /vào trận/i }).click();
}

test('menu loads with the 3D world behind it', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /chơi với máy/i })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test('a full round vs the NPC in the match HUD', async ({ page }) => {
  const errors = trackErrors(page);
  await startNpcMatch(page);

  // HUD: both side panels with 5 hearts, 3 cards in hand
  await expect(page.getByRole('img', { name: /5\/5 máu/ })).toHaveCount(2);
  const hand = page.locator('button[aria-pressed]').filter({ hasText: /Kéo|Búa|Bao/ });
  await expect(hand).toHaveCount(3);

  await page.getByRole('button', { name: /bỏ qua/i }).click();
  await expect(page.getByText(/pha chọn bài/i)).toBeVisible({ timeout: 10_000 });
  await hand.first().click();
  await expect(hand.first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^sẵn sàng$/i }).click();

  // the NPC locks in within the phase; then the round resolves
  await expect(page.getByText(/kết quả lượt/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/thắng lượt|hòa lượt/i)).toBeVisible();
  expect(errors).toEqual([]);
});

test('graphics toggle halves the render resolution', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1, { timeout: 15_000 });
  const width = () => page.locator('canvas').evaluate((c) => c.width);
  // wait for the first resize (a fresh canvas starts at the default 300px)
  await expect.poll(width).toBeGreaterThan(600);
  const high = await width();
  await page.getByRole('button', { name: /đồ họa: cao/i }).click();
  await expect(page.getByRole('button', { name: /đồ họa: thấp/i })).toBeVisible();
  await expect.poll(width).toBe(high / 2);
});

test('language switch to English', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('button', { name: /play vs npc/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /graphics: high/i })).toBeVisible();
});

test('online: two players vote different stages and see the same pick', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  for (const p of [a, b]) {
    await p.goto('/');
    await p.getByRole('button', { name: /chơi trực tuyến/i }).click();
    await p.getByRole('button', { name: /tiếp tục ›/i }).click();
    await p.getByRole('button', { name: /vào trận/i }).click();
  }
  await a.getByRole('button', { name: 'Nghĩa Địa Sương' }).click();
  await a.getByRole('button', { name: /tạo phòng/i }).click();
  const code = (await a.locator('.text-3xl').textContent()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}$/);

  await b.getByRole('button', { name: 'Tháp Pháp Sư' }).click();
  await b.getByLabel(/mã phòng/i).fill(code);
  await b.getByRole('button', { name: /vào phòng/i }).click();

  const notice = /Ngẫu nhiên giữa Nghĩa Địa Sương và Tháp Pháp Sư → (Nghĩa Địa Sương|Tháp Pháp Sư)/;
  await expect(a.getByText(notice)).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText(notice)).toBeVisible();
  expect(await a.getByText(notice).textContent()).toBe(await b.getByText(notice).textContent());
});
