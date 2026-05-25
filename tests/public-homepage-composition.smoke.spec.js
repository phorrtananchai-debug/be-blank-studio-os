import { expect, test } from '@playwright/test';

async function verifyHomepageComposition(page, testInfo, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto('/work');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'BE BLANK TO BEHIND STUDIO' })).toBeVisible();
  await expect(page.getByText('selected archive').first()).toBeVisible();

  const geometry = await page.evaluate(() => {
    const masthead = document.querySelector('.public-masthead-type');
    const selectedTitle = document.querySelector('h2.public-project-title');
    const cards = Array.from(document.querySelectorAll('section button.group'));
    const viewportWidth = window.innerWidth;

    const mastheadRect = masthead?.getBoundingClientRect();
    const titleRect = selectedTitle?.getBoundingClientRect();
    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const cardsInBounds = cardRects.every((rect) => rect.left >= -1 && rect.right <= viewportWidth + 1);

    return {
      cardsInBounds,
      mastheadBottom: mastheadRect?.bottom ?? 0,
      selectedTitleTop: titleRect?.top ?? 0,
      totalCards: cardRects.length,
    };
  });

  expect(geometry.totalCards).toBeGreaterThan(0);
  expect(geometry.cardsInBounds).toBeTruthy();
  expect(geometry.selectedTitleTop).toBeGreaterThan(geometry.mastheadBottom + 8);

  await page.screenshot({ path: testInfo.outputPath(`public-homepage-${width}.png`), fullPage: true });
}

test.describe('public homepage composition rhythm', () => {
  test('stays controlled at desktop widths', async ({ page }, testInfo) => {
    await verifyHomepageComposition(page, testInfo, 1440, 1080);
    await verifyHomepageComposition(page, testInfo, 1920, 1080);
  });
});
