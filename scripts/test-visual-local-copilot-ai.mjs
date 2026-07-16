import { chromium } from 'playwright';

const settingsKey = 'visual-local-copilot-settings-v1';
const openAiKey = 'visual-local-copilot-key:openai_compatible';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('visual-local-copilot:')) localStorage.removeItem(key);
  });
});
const page = await context.newPage();
page.on('dialog', async (dialog) => dialog.accept());

async function openBuilder() {
  await page.goto('http://127.0.0.1:5173/visual-local', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    localStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => database.name ? new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve(undefined);
    }) : undefined));
    localStorage.setItem('visual-local-product-mode', 'quick');
    localStorage.setItem('visual-local-production-stage-v1', 'project');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('project-profile-selector').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByTestId('project-profile-selector').getByRole('button').filter({ hasText: 'Karun' }).click();
  const renderPassButton = page.getByRole('button', { name: 'Render Pass Builder' }).first();
  if (await renderPassButton.count()) await renderPassButton.click();
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
}

async function textareaValues() {
  return page.locator('textarea').evaluateAll((items) => items.map((item) => item.value).join('\n'));
}

async function runCopilot(message) {
  const panel = page.getByTestId('visual-local-copilot');
  await panel.getByTestId('visual-local-copilot-input').fill(message);
  await panel.getByRole('button', { name: 'Interpret' }).click();
  return panel;
}

try {
  let repairRequestCount = 0;
  await page.route('https://mock-copilot.local/invalid/chat/completions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'not valid json' });
  });
  await page.route('https://mock-copilot.local/auth/chat/completions', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Invalid API key', type: 'authentication_error' } }),
    });
  });
  await page.route('https://mock-copilot.local/repair/chat/completions', async (route) => {
    repairRequestCount += 1;
    if (repairRequestCount === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: JSON.stringify({
            assistantMessage: 'Needs repair.',
            proposedActions: [{ type: 'delete_project', title: 'Delete project', rationale: 'Unsafe action', payload: {} }],
          }) } }],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({
          assistantMessage: 'Repaired into safe Copilot action.',
          proposedActions: [
            { type: 'request_missing_information', title: 'Ask for safe scope', rationale: 'Unsafe action was replaced during repair.', payload: { question: 'Which safe scene goal should be prepared?' }, affectedScope: 'ui', riskLevel: 'low', requiresConfirmation: false },
          ],
        }) } }] } }],
      }),
    });
  });
  await page.route('https://mock-copilot.local/unsupported/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ assistantMessage: 'Bad action', proposedActions: [{ type: 'delete_project', title: 'Delete', rationale: 'bad', payload: {}, affectedScope: 'project', riskLevel: 'high' }] }) } }],
      }),
    });
  });
  await page.route('https://mock-copilot.local/valid/chat/completions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          assistantMessage: 'Prepared validated prompt actions.',
          understoodIntent: 'Improve restrained premium material realism.',
          proposedActions: [
            { type: 'set_goal', title: 'Enable Photographic Finish', rationale: 'The request asks for real architectural photography.', payload: { goalId: 'photographic_finish' }, affectedScope: 'scene', riskLevel: 'low', requiresConfirmation: false },
            { type: 'add_generation_note', title: 'Add Copilot generation note', rationale: 'Keep the user request inspectable in the shared compiler.', payload: { text: 'Copilot AI note: premium architectural photography realism; avoid cinematic orange glow.' }, affectedScope: 'prompt', riskLevel: 'low', requiresConfirmation: false },
            { type: 'inspect_compiled_prompt', title: 'Open inspector', rationale: 'Review provider-ready prompt before generating.', payload: { activeTab: 'render-pass' }, affectedScope: 'ui', riskLevel: 'low', requiresConfirmation: false },
          ],
          warnings: [],
          conflicts: [],
          confidence: 0.91,
        }) } }],
      }),
    });
  });
  await page.route('https://mock-copilot.local/v1/chat/completions', async (route) => {
    const body = route.request().postDataJSON();
    if (body.response_format) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'unknown parameter response_format', type: 'invalid_request_error' } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{
          finish_reason: 'stop',
          message: {
            content: [
              { type: 'text', text: '```json\n' },
              { type: 'text', text: JSON.stringify({
                assistantMessage: 'Prepared DeepSeek-compatible structured actions.',
                proposedActions: [
                  { type: 'add_generation_note', title: 'Add array-content note', rationale: 'Validate array text-part extraction.', payload: { text: 'DeepSeek array content parsed successfully.' }, affectedScope: 'prompt', riskLevel: 'low', requiresConfirmation: false },
                ],
              }) },
              { type: 'text', text: '\n```' },
            ],
          },
        }],
      }),
    });
  });

  await openBuilder();

  await page.evaluate(({ settingsKey }) => {
    localStorage.setItem(settingsKey, JSON.stringify({
      mode: 'auto_fallback',
      providerId: 'openai_compatible',
      model: 'deepseek-chat',
      endpoint: 'https://mock-copilot.local/missing-key',
      sendImagesExplicitOnly: true,
      maxContextMessages: 6,
      languagePreference: 'auto',
      detailLevel: 'balanced',
      timeoutMs: 8000,
      retryCount: 0,
    }));
    localStorage.removeItem('visual-local-copilot-key:openai_compatible');
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  let panel = await runCopilot('The bench is too brown. Restore Karun maroon leather, soften brass yellow, keep everything in the same place.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Enable Better Materials' }).waitFor({ state: 'visible', timeout: 5000 });
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Enable Better Lighting' }).waitFor({ state: 'visible', timeout: 5000 });
  if (!(await panel.textContent())?.includes('fallback')) throw new Error('Auto-fallback provider failure did not disclose deterministic fallback.');
  await panel.getByRole('button', { name: /Apply Proposed/ }).click();
  const afterFallback = await textareaValues();
  if (!afterFallback.includes('Karun deep tea-red / maroon / oxblood leather')) throw new Error('Auto-fallback actions did not update shared prompt state.');
  if (afterFallback.includes('Mock Preview / API not connected')) throw new Error('Copilot should not trigger generation.');

  await page.evaluate(({ settingsKey, openAiKey }) => {
    localStorage.setItem(settingsKey, JSON.stringify({
      mode: 'ai_assisted',
      providerId: 'openai_compatible',
      model: 'mock-invalid',
      endpoint: 'https://mock-copilot.local/invalid',
      sendImagesExplicitOnly: true,
      maxContextMessages: 6,
      languagePreference: 'auto',
      detailLevel: 'balanced',
      timeoutMs: 8000,
      retryCount: 0,
    }));
    localStorage.setItem(openAiKey, 'sk-TEST_COPILOT_SECRET_SHOULD_NOT_APPEAR');
  }, { settingsKey, openAiKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  const beforeInvalid = await textareaValues();
  panel = await runCopilot('Make this more premium.');
  await panel.getByText(/JSON could not be parsed safely|Empty AI response|Malformed JSON/i).waitFor({ state: 'visible', timeout: 5000 });
  const afterInvalid = await textareaValues();
  if (afterInvalid !== beforeInvalid) throw new Error('Invalid provider JSON mutated prompt state.');

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/unsupported';
    settings.model = 'mock-unsupported';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  const beforeUnsupported = await textareaValues();
  panel = await runCopilot('Delete the project.');
  await panel.getByText(/action types Visual Local will not apply|Schema validation failed|safe Copilot action schema/i).waitFor({ state: 'visible', timeout: 5000 });
  const afterUnsupported = await textareaValues();
  if (afterUnsupported !== beforeUnsupported) throw new Error('Unsupported provider action mutated prompt state.');

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/valid';
    settings.model = 'mock-valid';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Make it premium but not cinematic.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Add Copilot generation note' }).waitFor({ state: 'visible', timeout: 5000 });
  await panel.getByRole('button', { name: /Apply Proposed/ }).click();
  const afterValid = await textareaValues();
  if (!afterValid.includes('Copilot AI note: premium architectural photography realism')) throw new Error('Validated AI action did not update shared prompt state.');
  await page.getByText('Compiled Prompt Inspector').waitFor({ state: 'visible', timeout: 5000 });

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/v1';
    settings.model = 'deepseek-chat';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Use DeepSeek compatible JSON mode.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Add array-content note' }).waitFor({ state: 'visible', timeout: 5000 });
  await panel.getByRole('button', { name: /Apply Proposed/ }).click();
  const afterArrayContent = await textareaValues();
  if (!afterArrayContent.includes('DeepSeek array content parsed successfully.')) throw new Error('OpenAI-compatible array content/fenced JSON response did not parse.');

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/valid/chat/completions';
    settings.model = 'deepseek-chat';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Use a full OpenAI-compatible endpoint.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Add Copilot generation note' }).waitFor({ state: 'visible', timeout: 5000 });

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/v1/chat/completions';
    settings.model = 'deepseek-chat';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Use a versioned full OpenAI-compatible endpoint.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Add array-content note' }).waitFor({ state: 'visible', timeout: 5000 });

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.endpoint = 'https://mock-copilot.local/repair';
    settings.model = 'deepseek-chat';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Try an unsafe action and repair it.');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Ask for safe scope' }).waitFor({ state: 'visible', timeout: 5000 });
  if (repairRequestCount < 2) throw new Error('Schema repair attempt did not run.');

  await panel.getByRole('button', { name: 'Minimize Visual Local Copilot' }).click();
  const toggle = page.getByTestId('visual-local-copilot-toggle');
  await toggle.waitFor({ state: 'visible', timeout: 5000 });
  const toggleLabel = await toggle.getAttribute('aria-label');
  if (toggleLabel !== 'Open Visual Local Copilot') throw new Error('Minimized Copilot icon is missing accessible label.');
  const persistedVisibility = await page.evaluate(() => localStorage.getItem('visual-local-copilot-ui-state-v1'));
  if (persistedVisibility !== 'minimized') throw new Error('Minimized Copilot visibility state was not persisted.');
  await toggle.click();
  panel = page.getByTestId('visual-local-copilot');
  await panel.locator('[data-testid="copilot-action-card"]').filter({ hasText: 'Ask for safe scope' }).waitFor({ state: 'visible', timeout: 5000 });

  await page.evaluate(({ settingsKey }) => {
    const settings = JSON.parse(localStorage.getItem(settingsKey));
    settings.mode = 'ai_assisted';
    settings.endpoint = 'https://mock-copilot.local/auth';
    settings.model = 'deepseek-chat';
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, { settingsKey });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('visual-local-copilot').waitFor({ state: 'visible', timeout: 5000 });
  panel = await runCopilot('Use invalid credentials.');
  await panel.getByText(/Authentication failed/i).waitFor({ state: 'visible', timeout: 5000 });

  const copilotStorage = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => key.startsWith('visual-local-copilot:')).map(([, value]) => value).join('\n'));
  if (copilotStorage.includes('sk-TEST_COPILOT_SECRET_SHOULD_NOT_APPEAR')) throw new Error('Copilot history stored API key text.');
  if (copilotStorage.includes('data:image/')) throw new Error('Copilot history stored raw image data.');

  console.log('Visual Local AI Copilot provider test passed');
} finally {
  await browser.close();
}
