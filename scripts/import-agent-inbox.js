/* eslint-env node */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const inboxPath = path.join(rootDir, 'data', 'agent-inbox.json');
const apiUrl = 'http://127.0.0.1:8787/api/projects';

function normalizeInbox(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.projects)) {
    return data.projects;
  }

  if (data && typeof data === 'object') {
    return [data];
  }

  return [];
}

async function postProject(project) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(project),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API returned ${response.status}: ${errorBody}`);
  }

  return response.json();
}

try {
  const inbox = JSON.parse(await readFile(inboxPath, 'utf8'));
  const projects = normalizeInbox(inbox).filter((project) => project && typeof project === 'object');

  if (projects.length === 0) {
    console.log('Agent inbox is empty. Paste one project object or an array of projects into data/agent-inbox.json.');
    process.exit(0);
  }

  for (const project of projects) {
    const savedProject = await postProject(project);
    console.log(`Imported project: ${savedProject.name || savedProject.id}`);
  }

  await writeFile(inboxPath, '[]\n', 'utf8');
  console.log('Agent inbox imported successfully and cleared.');
} catch (error) {
  if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
    console.error('Local API is not running. Please run npm run server or npm run dev:full first.');
  } else {
    console.error(`Agent inbox import failed: ${error.message}`);
  }

  process.exitCode = 1;
}
