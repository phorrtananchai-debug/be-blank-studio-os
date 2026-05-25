import { expect, test } from '@playwright/test';

async function verifyHomepageComposition(page, testInfo, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto('/work');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'BE BLANK TO BEHIND STUDIO' })).toBeVisible();

  const geometry = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.public-work-item'));
    const viewportWidth = window.innerWidth;

    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const minVisibleRatio = cardRects.length
      ? Math.min(...cardRects.map((rect) => {
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        return rect.width > 0 ? visibleWidth / rect.width : 0;
      }))
      : 0;
    const fullyHiddenCards = cardRects.filter((rect) => rect.right <= 0 || rect.left >= viewportWidth).length;
    let overlapPairs = 0;

    for (let i = 0; i < cardRects.length; i += 1) {
      for (let j = i + 1; j < cardRects.length; j += 1) {
        const a = cardRects[i];
        const b = cardRects[j];
        const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        if (overlaps) overlapPairs += 1;
      }
    }

    const maxPairs = cardRects.length > 1 ? (cardRects.length * (cardRects.length - 1)) / 2 : 0;
    const overlapRatio = maxPairs ? overlapPairs / maxPairs : 0;

    return {
      minVisibleRatio,
      fullyHiddenCards,
      totalCards: cardRects.length,
      overlapPairs,
      overlapRatio,
    };
  });

  expect(geometry.totalCards).toBeGreaterThan(0);
  expect(geometry.fullyHiddenCards).toBe(0);
  expect(geometry.minVisibleRatio).toBeGreaterThan(0.16);
  expect(geometry.overlapRatio).toBeLessThan(0.7);
  if (geometry.totalCards >= 4) {
    expect(geometry.overlapPairs).toBeGreaterThan(0);
  }

  await page.screenshot({ path: testInfo.outputPath(`public-homepage-${width}.png`), fullPage: true });
}

test.describe('public homepage composition rhythm', () => {
  test('stays controlled at desktop widths', async ({ page }, testInfo) => {
    await verifyHomepageComposition(page, testInfo, 1440, 1080);
    await verifyHomepageComposition(page, testInfo, 1920, 1080);
  });
});
