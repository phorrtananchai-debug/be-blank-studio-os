import { test, expect } from '@playwright/test';

test('verify final dashboard state', async ({ page }) => {
  // Bypass auth
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.setItem('studio_mock_user', JSON.stringify({ uid: 'test-user', email: 'test@example.com' }));
  });
  await page.reload();

  // Wait for dashboard
  await page.waitForSelector('text=today');

  // Take a full page screenshot
  await page.screenshot({ path: 'verification/final_dashboard.png', fullPage: true });

  // Verify sans-serif is used (checking computed font-family)
  const font = await page.evaluate(() => {
    const el = document.querySelector('h1') || document.querySelector('h2');
    return window.getComputedStyle(el).fontFamily;
  });
  console.log('Computed font family:', font);
  expect(font).toContain('Inter');
});
