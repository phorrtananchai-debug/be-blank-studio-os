import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(), 'src');
const interactivePattern = /<(button|input|select|textarea|a)\b|role=["']button["']|type=["']checkbox["']/i;
const summaryPattern = /<summary\b[^>]*>([\s\S]*?)<\/summary>/gi;
const extensions = new Set(['.tsx', '.ts', '.jsx', '.js']);
const failures = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (extensions.has(path.extname(entry.name))) {
      await inspectFile(full);
    }
  }
}

async function inspectFile(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  for (const match of text.matchAll(summaryPattern)) {
    const content = match[1];
    if (!interactivePattern.test(content)) continue;
    const before = text.slice(0, match.index || 0);
    const line = before.split(/\r?\n/).length;
    failures.push(`${path.relative(process.cwd(), filePath)}:${line}`);
  }
}

await walk(root);

if (failures.length) {
  console.error('Interactive descendants found inside <summary>:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS: no interactive descendants inside <summary>');
