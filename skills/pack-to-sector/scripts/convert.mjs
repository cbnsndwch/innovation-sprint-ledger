#!/usr/bin/env node
// Sector Exploration Pack (.docx) → <id>.json. Runs with Node 18+ or Bun, no installs.
//   node convert.mjs Pack.docx [more.docx…] [--out folder]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(join(here, 'pack.js')).href);
const SP = globalThis.SectorPack;
const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = resolve(oi >= 0 ? args[oi + 1] : '.');
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
if (!files.length) { console.log('Usage: node convert.mjs Pack.docx [more.docx…] [--out folder]'); process.exit(1); }
mkdirSync(out, { recursive: true });
for (const f of files) {
  const buf = readFileSync(f);
  const s = await SP.fromDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  s.sourceFile = basename(f); s.parsedAt = new Date().toISOString();
  const p = join(out, s.id + '.json');
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
  const probs = SP.check(s);
  console.log(`${probs.length ? '!' : '✓'} ${s.name} → ${p}`);
  console.log(`  ${s.keyFigures.length} key figures · ${s.players.length} company types · ${s.valueChain.steps.length} value-chain steps · ${s.sprint2Questions.length} Sprint 2 questions · ${s.glossary.length} glossary terms · ${s.sources.length} source groups`);
  if (s.extra.length) console.log(`  unmapped sections: ${s.extra.map(x => x.title).join(', ')}`);
  if (probs.length) console.log(`  check: ${probs.join('; ')}`);
}
