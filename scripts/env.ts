/**
 * Minimal .env loader for stand-alone scripts (Next.js loads .env itself).
 * Import this module FIRST, before anything that reads process.env at import
 * time — ES module side effects run in import order.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function load(file: string, override = false) {
  const full = path.join(process.cwd(), file);
  if (!existsSync(full)) return;
  for (const rawLine of readFileSync(full, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, '').trim();
    if (override || process.env[key] === undefined) process.env[key] = value;
  }
}

load('.env');
load('.env.local', true);
