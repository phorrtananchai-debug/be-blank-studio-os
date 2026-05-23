import { test, expect } from '@playwright/test';

test.describe('Studio OS Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass auth
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('studio_mock_user', JSON.stringify({ uid: 'test-user', email: 'test@example.com' }));
    });
    await page.reload();
  });

  test('verify project dashboard access', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');
    await expect(page.locator('text=Active Projects')).toBeVisible();
  });

  test('verify timeline access', async ({ page }) => {
    await page.goto('http://localhost:5173/os/timeline');
    await expect(page.locator('text=Schedule Overview')).toBeVisible();
  });

  test('verify mobile view redirect', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/');
    await expect(page).toHaveURL(/.*\/m/);
  });

  test('verify client mode projection safety', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');

    // Open the first project
    await page.click('text=Open Detail');

    // Check internal data is visible in internal mode
    await page.click('text=Notes & Logs');
    await expect(page.locator('text=Strategic Notes')).toBeVisible();
    await expect(page.locator('text=Critical Blockers')).toBeVisible();

    // Toggle Client Mode
    await page.click('text=Client Mode');

    // Verify internal tabs and data are hidden
    await expect(page.locator('text=Strategic Notes')).not.toBeVisible();
    await expect(page.locator('text=Critical Blockers')).not.toBeVisible();
    await expect(page.locator('text=Deliverables')).not.toBeVisible();
    await expect(page.locator('text=AI Insights')).not.toBeVisible();

    // Return to internal mode
    await page.click('text=Internal View');
    await expect(page.locator('text=Strategic Notes')).toBeVisible();
  });
});
