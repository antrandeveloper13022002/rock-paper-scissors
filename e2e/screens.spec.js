import { test } from '@playwright/test';

// Visual check, not an assertion: saves the key screens to test-results/screens/
// so they can be compared with the design board.
test('capture screens for design review', async ({ page }) => {
  const shot = (name) => page.screenshot({ path: `test-results/screens/${name}.png` });
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1500);
  await shot('01-menu');
  await page.getByRole('button', { name: /chơi với máy/i }).click();
  await page.getByRole('button', { name: /Thạch Linh/ }).click();
  await page.waitForTimeout(1500);
  await shot('02-character-select');
  await page.getByRole('button', { name: /tiếp tục ›/i }).click();
  await page.waitForTimeout(800);
  await shot('03-deck');
  await page.getByRole('button', { name: /vào trận/i }).click();
  await page.waitForTimeout(1500);
  await shot('04-match-skill');
  await page.getByRole('button', { name: /bỏ qua/i }).click();
  await page.getByText(/pha chọn bài/i).waitFor();
  await page.locator('button[aria-pressed]').filter({ hasText: /Kéo|Búa|Bao/ }).nth(1).click();
  await page.waitForTimeout(300);
  await shot('05-match-choose');
});

test('capture the match on a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /chơi với máy/i }).click();
  await page.getByRole('button', { name: /tiếp tục ›/i }).click();
  await page.getByRole('button', { name: /vào trận/i }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/screens/06-match-phone.png' });
});
