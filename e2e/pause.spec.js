import { test, expect } from '@playwright/test';

// Contexts opened by hand are closed after each test, so their sockets don't
// pile up against the server's per-address connection limit.
const openContexts = [];
test.afterEach(async () => {
  await Promise.all(openContexts.splice(0).map((c) => c.close()));
});
async function newContext(browser) {
  const ctx = await browser.newContext();
  openContexts.push(ctx);
  return ctx;
}

async function startNpcMatch(page) {
  await page.goto('/');
  await page.getByRole('button', { name: /chơi với máy/i }).click();
  await page.getByRole('button', { name: /tiếp tục ›/i }).click();
  await page.getByRole('button', { name: /vào trận/i }).click();
  await expect(page.getByText(/pha kỹ năng/i)).toBeVisible();
}

// Two players matched through random matchmaking; returns both pages.
async function startOnlineMatch(browser) {
  const ctxA = await newContext(browser);
  const ctxB = await newContext(browser);
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  for (const p of [a, b]) {
    await p.goto('/');
    await p.getByRole('button', { name: /chơi trực tuyến/i }).click();
    await p.getByRole('button', { name: /tiếp tục ›/i }).click();
    await p.getByRole('button', { name: /vào trận/i }).click();
  }
  await a.getByRole('button', { name: /tìm trận ngẫu nhiên/i }).click();
  await expect(a.getByText(/đang tìm đối thủ/i)).toBeVisible();
  await b.getByRole('button', { name: /tìm trận ngẫu nhiên/i }).click();
  for (const p of [a, b]) await expect(p.getByRole('button', { name: /tạm dừng/i })).toBeVisible({ timeout: 10_000 });
  return { a, b, ctxA };
}

const timerText = (page) => page.getByText(/\d+s$/).first().textContent();

test('vs NPC: pause freezes the match; clicking outside continues; leaving goes to the menu', async ({ page }) => {
  await startNpcMatch(page);
  await page.getByRole('button', { name: /tạm dừng/i }).click();
  const dialog = page.getByRole('dialog', { name: /tạm dừng/i });
  await expect(dialog).toBeVisible();

  const before = await timerText(page);
  await page.waitForTimeout(2200);
  expect(await timerText(page)).toBe(before); // countdown frozen

  await page.mouse.click(10, 400); // outside the window = continue
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: /tạm dừng/i }).click();
  await page.getByRole('button', { name: /về trang chính/i }).click();
  await expect(page.getByRole('button', { name: /chơi với máy/i })).toBeVisible();
});

test('online: a pausing player who leaves gives the opponent the win', async ({ browser }) => {
  const { a, b } = await startOnlineMatch(browser);
  await expect(a.getByRole('button', { name: 'Tạm dừng (3)' })).toBeVisible();
  await a.getByRole('button', { name: /tạm dừng/i }).click();
  await expect(a.getByRole('dialog')).toContainText(/còn \d+ giây/i);
  await expect(a.getByRole('dialog')).toContainText('Còn 2/3 lần tạm dừng.');
  await expect(b.getByText(/đối thủ đang tạm dừng/i)).toBeVisible();

  await a.getByRole('button', { name: /về trang chính/i }).click();
  await expect(b.getByText('Bạn thắng!', { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(b.getByText(/vì đối thủ đã rời trận/i)).toBeVisible();
});

test('online: a closed tab can rejoin the match from the menu', async ({ browser }) => {
  const { a, b, ctxA } = await startOnlineMatch(browser);
  await a.close();
  await expect(b.getByText(/đối thủ mất kết nối/i)).toBeVisible({ timeout: 5_000 });

  const back = await ctxA.newPage(); // same browser profile → same saved rejoin token
  await back.goto('/');
  // the menu says which match it is and how long is left
  await expect(back.getByText(/ vs .* · Lượt 1\/7 · 0–0/)).toBeVisible();
  await expect(back.getByText(/còn \d+ giây để vào lại/)).toBeVisible();
  await back.getByRole('button', { name: /vào lại trận đang dở/i }).click();
  await expect(back.getByRole('button', { name: /tạm dừng/i })).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText(/đối thủ mất kết nối/i)).toBeHidden();
});

test('online: coming back after the 30 s shows that the match ended, with the result', async ({ browser }) => {
  test.setTimeout(90_000);
  const { a, b, ctxA } = await startOnlineMatch(browser);
  await a.close();
  await expect(b.getByText(/đối thủ mất kết nối/i)).toBeVisible({ timeout: 5_000 });
  await expect(b.getByText('Bạn thắng!', { exact: true })).toBeVisible({ timeout: 40_000 });
  await expect(b.getByText(/vì đối thủ mất kết nối quá 30 giây/)).toBeVisible();

  const late = await ctxA.newPage();
  await late.goto('/');
  await expect(late.getByText(/đã kết thúc vì bạn không quay lại trong 30 giây/)).toBeVisible();
  await late.getByRole('button', { name: /xem kết quả/i }).click();
  await expect(late.getByText('Bạn thua!', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(late.getByText(/vì bạn mất kết nối quá 30 giây/)).toBeVisible();
});
