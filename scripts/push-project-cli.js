/* eslint-env node */
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

const apiUrl = 'http://127.0.0.1:8787/api/projects';

const rl = readline.createInterface({
  input,
  output,
  crlfDelay: Infinity,
  terminal: true,
});

async function ask(question, fallback = '') {
  input.resume();

  return new Promise((resolve) => {
    const prompt = fallback ? `${question} (${fallback}): ` : `${question}: `;

    rl.question(prompt, (answer) => {
      const value = answer.trim() || fallback;
      console.log(`Captured: ${question}`);
      resolve(value);
    });
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

try {
  const answers = {};
  const questions = [
    ['name', 'Project name'],
    ['client', 'Client'],
    ['location', 'Location'],
    ['status', 'Status', 'concept'],
    ['startDate', 'Start date'],
    ['handoverDate', 'Handover date'],
    ['openingDate', 'Opening date'],
    ['notes', 'Notes'],
    ['nextAction', 'Next action'],
    ['blocker', 'Blocker'],
    ['riskLevel', 'Risk level', 'Low'],
    ['areaSqm', 'Area sqm', '0'],
    ['ratePerSqm', 'Rate per sqm', '0'],
    ['targetCost', 'Target cost', '0'],
    ['actualCost', 'Actual cost', '0'],
  ];

  for (const [key, question, fallback] of questions) {
    answers[key] = await ask(question, fallback);
  }

  const {
    name,
    client,
    location,
    status,
    startDate,
    handoverDate,
    openingDate,
    notes,
    nextAction,
    blocker,
    riskLevel,
    areaSqm,
    ratePerSqm,
    targetCost,
    actualCost,
  } = answers;
  const projectValue = String(toNumber(areaSqm) * toNumber(ratePerSqm));

  const payload = {
    name,
    client,
    location,
    status,
    startDate,
    handoverDate,
    openingDate,
    notes,
    nextAction,
    blocker,
    riskLevel,
    areaSqm,
    ratePerSqm,
    projectValue,
    targetCost,
    actualCost,
  };

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
  console.log(`Project pushed successfully: ${project.name}`);
} catch (error) {
  if (error.cause?.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
    console.error('Local API is not running. Please run npm run server or npm run dev:full first.');
  } else {
    console.error(`Project push failed: ${error.message}`);
  }

  process.exitCode = 1;
} finally {
  rl.close();
}
