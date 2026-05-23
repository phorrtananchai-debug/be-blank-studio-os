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
    await page.click('text=Open Detail');

    await page.click('text=Notes & Logs');
    await expect(page.locator('text=Strategic Notes')).toBeVisible();
    await expect(page.locator('text=Critical Blockers')).toBeVisible();

    await page.click('text=Client Mode');
    await expect(page.locator('text=Strategic Notes')).not.toBeVisible();
    await expect(page.locator('text=Critical Blockers')).not.toBeVisible();
    await expect(page.locator('text=Deliverables')).not.toBeVisible();
    await expect(page.locator('text=AI Insights')).not.toBeVisible();

    await page.click('text=Internal View');
    await expect(page.locator('text=Strategic Notes')).toBeVisible();
  });

  test('verify project creation workflow', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');
    await page.click('text=New Project');
    await expect(page.locator('input[value="Untitled Project"]')).toBeVisible();
  });

  test('verify material approval entry', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');
    await page.click('text=Open Detail');
    await page.click('text=Materials');
    await page.click('text=Add Material');
    await expect(page.locator('input[value="New Material"]')).toBeVisible();
  });

  test('verify billing milestone entry', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');
    await page.click('text=Open Detail');
    await page.click('text=Billing');
    await page.click('text=Add Milestone');
    await expect(page.locator('input[value="New Milestone"]')).toBeVisible();
  });

  test('verify site log entry', async ({ page }) => {
    await page.goto('http://localhost:5173/os/projects');
    await page.click('text=Open Detail');
    await page.click('text=Notes & Logs');
    await page.click('text=New Entry');
    // Expect multiple observation fields (legacy vs new)
    await expect(page.locator('text=Observations').first()).toBeVisible();
  });

  test('verify artwork space access', async ({ page }) => {
    await page.goto('http://localhost:5173/os/artwork');
    await expect(page.locator('text=Studio Spaces')).toBeVisible();
  });

  test('verify gallery manager access', async ({ page }) => {
    await page.goto('http://localhost:5173/os/portfolio');
    await expect(page.locator('text=Portfolio Asset Manager')).toBeVisible();
  });
});
