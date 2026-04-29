/* eslint-env node */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payloadPath = path.join(__dirname, 'data', 'push-project.json');
const apiUrl = 'http://127.0.0.1:8787/api/projects';

try {
  const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API returned ${response.status}: ${errorBody}`);
  }

  const project = await response.json();
  console.log(`Project pushed successfully: ${project.name || project.id}`);
} catch (error) {
  console.error(`Project push failed: ${error.message}`);
  process.exitCode = 1;
}
