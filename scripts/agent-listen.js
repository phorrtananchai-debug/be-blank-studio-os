/* eslint-env node */
import { execFile } from 'node:child_process';
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const apiUrl = 'http://127.0.0.1:8787/api/agent/create-project';
let lastClipboardJson = '';
let isExecutingClipboard = false;

const rl = readline.createInterface({
  input,
  output,
  crlfDelay: Infinity,
  terminal: true,
});

function parseMaybeJson(value) {
  const trimmed = value.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeCommandPayload(command) {
  const json = parseMaybeJson(command);
  return json || { input: command };
}

async function sendPayload(payload) {
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

  return response.json();
}

async function executeCommand(command, source = 'terminal') {
  const payload = normalizeCommandPayload(command);
  const result = await sendPayload(payload);

  if (payload.action) {
    console.log('Agent executed from ChatGPT command');
  }

  console.log(`${result.action === 'update' ? 'Updated' : 'Created'} project: ${result.project.name} (${result.storage})`);

  if (source === 'clipboard' && !payload.action) {
    console.log('Agent executed from clipboard JSON');
  }
}

function handleAgentError(error) {
  if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
    console.error('Local API is not running. Please run npm run server or npm run dev:full first.');
  } else {
    console.error(`Agent command failed: ${error.message}`);
  }
}

async function readClipboard() {
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', 'Get-Clipboard -Raw'], {
      windowsHide: true,
    });
    return stdout.trim();
  }

  if (process.platform === 'darwin') {
    const { stdout } = await execFileAsync('pbpaste');
    return stdout.trim();
  }

  const { stdout } = await execFileAsync('sh', ['-lc', 'command -v xclip >/dev/null && xclip -selection clipboard -o || wl-paste']);
  return stdout.trim();
}

async function watchClipboard() {
  if (isExecutingClipboard) {
    return;
  }

  try {
    const clipboard = await readClipboard();
    const parsed = parseMaybeJson(clipboard);

    if (!parsed || clipboard === lastClipboardJson) {
      return;
    }

    lastClipboardJson = clipboard;
    isExecutingClipboard = true;
    await executeCommand(clipboard, 'clipboard');
  } catch {
    // Clipboard access is best-effort; terminal input still works.
  } finally {
    isExecutingClipboard = false;
  }
}

function prompt() {
  rl.question('Agent project command: ', async (answer) => {
    const command = answer.trim();

    if (command.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    if (!command) {
      prompt();
      return;
    }

    try {
      await executeCommand(command);
    } catch (error) {
      handleAgentError(error);
    }

    prompt();
  });
}

console.log('Paste commands like: Project Name, Client Name, 2026-06-30');
console.log('Or paste/copy JSON like: {"action":"create_project","payload":{"name":"Aurum Residence"}}');
console.log('Clipboard watcher is active for copied JSON. Use "exit" to quit.');

setInterval(watchClipboard, 1500);
prompt();
