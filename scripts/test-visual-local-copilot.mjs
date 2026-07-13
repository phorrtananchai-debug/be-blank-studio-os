import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('visual-local-copilot:')) localStorage.removeItem(key);
  });
});
const page = await context.newPage();
page.on('dialog', async (dialog) => dialog.accept());

try {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('visual-local-generation-key:google_lite_image', 'AIzaTEST_COPILOT_KEY_SHOULD_NOT_APPEAR_IN_COPILOT_HISTORY');
  });
  const renderPassButton = page.getByRole('button', { name: 'Render Pass Builder' }).first();
  if (await renderPassButton.count()) await renderPassButton.click();
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });

  const copilotPanel = page.getByTestId('visual-local-copilot');
  const input = copilotPanel.getByTestId('visual-local-copilot-input');
  await copilotPanel.getByRole('button', { name: /เบาะยังน้ำตาลไป/ }).click();
  await copilotPanel.getByRole('button', { name: 'Interpret' }).click();
  await copilotPanel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Enable Better Materials' }).waitFor({ state: 'visible', timeout: 5000 });
  await copilotPanel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Prepare bench material revision' }).waitFor({ state: 'visible', timeout: 5000 });
  await copilotPanel.getByRole('button', { name: /Apply Proposed/ }).click();

  await page.getByText('Compiled Prompt Inspector').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('aside').first().getByRole('button', { name: 'Quick Mode' }).click();
  await page.locator('aside').first().locator('textarea[placeholder="What should this render pass improve?"]').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('textarea')).some((item) => item.value.includes('Karun deep tea-red / maroon / oxblood leather'));
  }, null, { timeout: 5000 }).catch(() => undefined);
  const generationNote = await page.locator('aside').first().locator('textarea[placeholder="What should this render pass improve?"]').inputValue();
  if (!generationNote.includes('Karun deep tea-red / maroon / oxblood leather')) {
    const allTextareas = await page.locator('textarea').evaluateAll((items) => items.map((item) => ({ placeholder: item.getAttribute('placeholder'), value: item.value.slice(0, 500) })));
    throw new Error(`Copilot did not apply the Karun upholstery revision note to the generation request. Textareas: ${JSON.stringify(allTextareas)}`);
  }
  if (!generationNote.includes('เบาะยังน้ำตาลไป')) {
    throw new Error('Copilot did not preserve the original Thai request in the generation note.');
  }

  await input.fill('Change the bench upholstery to cream.');
  await copilotPanel.getByRole('button', { name: 'Interpret' }).click();
  await copilotPanel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Protected Karun material conflict' }).waitFor({ state: 'visible', timeout: 5000 });

  const copilotStores = await page.evaluate(() => {
    return Object.entries(localStorage)
      .filter(([key]) => key.startsWith('visual-local-copilot:'))
      .map(([, value]) => value)
      .join('\n');
  });
  if (copilotStores.includes('AIzaTEST_COPILOT_KEY_SHOULD_NOT_APPEAR_IN_COPILOT_HISTORY')) {
    throw new Error('Copilot conversation storage exposed a saved provider API key.');
  }

  console.log('Visual Local Copilot test passed');
} finally {
  await browser.close();
}
