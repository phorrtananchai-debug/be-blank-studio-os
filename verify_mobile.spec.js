import { test } from '@playwright/test';

test('mobile view verification', async ({ page }) => {
  // Set viewport to iPhone 12
  await page.setViewportSize({ width: 390, height: 844 });

  // Check Homepage
  await page.goto('http://localhost:5183/');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'mobile_homepage.png', fullPage: true });

  // Check Portfolio
  await page.goto('http://localhost:5183/work');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'mobile_work.png', fullPage: true });

  // Check OS Dashboard
  await page.goto('http://localhost:5183/os');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'mobile_os.png', fullPage: true });
});
