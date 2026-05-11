import { test } from '@playwright/test';

test('desktop view verification', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Check Homepage
  await page.goto('http://localhost:5183/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'desktop_homepage.png', fullPage: true });

  // Check Portfolio
  await page.goto('http://localhost:5183/work');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'desktop_work.png', fullPage: true });

  // Check OS Dashboard
  await page.goto('http://localhost:5183/os');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'desktop_os.png', fullPage: true });
});
