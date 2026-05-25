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
    const cardsInBounds = cardRects.every((rect) => rect.left >= -1 && rect.right <= viewportWidth + 1);
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
      cardsInBounds,
      totalCards: cardRects.length,
      overlapPairs,
      overlapRatio,
    };
  });

  expect(geometry.totalCards).toBeGreaterThan(0);
  expect(geometry.cardsInBounds).toBeTruthy();
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
