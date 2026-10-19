#!/usr/bin/env bun
/**
 * Innovation Sprint Ledger kit helper (Bun). For facilitators and maintainers only:
 * students just open sprint.html, which carries everything (sector packs, skills, the AI setup prompt).
 *
 *   bun kit.ts skills [--for claude,codex,cursor,grok]   install the agent skills on THIS machine (default: all four)
 *   bun kit.ts new <folder> [--sector <id | pack.docx | sector.json>] [--team "Team 3"]
 *                                                        pre-make a team folder (the board can also do this)
 *   bun kit.ts sector <pack.docx> [more.docx…]           turn Sector Exploration Packs into sectors/<id>.json
 *   bun kit.ts sectors                                   list the sector packs bundled in this kit
 */
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const KIT = import.meta.dir;
const argv = Bun.argv.slice(2);
const [cmd] = argv;
const opt = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith("--") && !(arr[i - 1] || "").startsWith("--"));
const SKILLS = join(KIT, "skills");
const SECTORS = join(KIT, "sectors");
const home = homedir();
const expand = (p: string) => resolve(p.replace(/^~(?=$|\/|\\)/, home));

// Where each agent looks for user-level skills. Codex, Cursor and Grok all read ~/.agents/skills,
// so one copy there serves the three of them (Cursor and Grok also read ~/.claude/skills).
const AGENTS: Record<string, { label: string; dir: string }> = {
  claude: { label: "Claude Code", dir: join(home, ".claude", "skills") },
  codex: { label: "Codex", dir: join(home, ".agents", "skills") },
  cursor: { label: "Cursor", dir: join(home, ".agents", "skills") },
  grok: { label: "Grok", dir: join(home, ".agents", "skills") },
};

async function loadPack() {
  await import(pathToFileURL(join(KIT, "src", "pack.js")).href);
  return (globalThis as any).SectorPack;
}
async function readSector(arg: string) {
  const local = join(SECTORS, arg.replace(/\.json$/, "") + ".json");
  if (existsSync(local)) return JSON.parse(await Bun.file(local).text());
  const p = expand(arg);
  if (!existsSync(p)) throw new Error(`No sector "${arg}". Run: bun kit.ts sectors`);
  if (/\.json$/i.test(p)) return JSON.parse(await Bun.file(p).text());
  const SP = await loadPack();
  const s = await SP.fromDocx(await Bun.file(p).arrayBuffer());
  return Object.assign(s, { sourceFile: basename(p), parsedAt: new Date().toISOString() });
}
const listSectors = () => existsSync(SECTORS) ? readdirSync(SECTORS).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")) : [];

if (cmd === "skills") {
  const want = (opt("--for") ?? "claude,codex,cursor,grok").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const bad = want.filter(w => !AGENTS[w]);
  if (bad.length) { console.log(`  Unknown agent: ${bad.join(", ")}. Choose from: ${Object.keys(AGENTS).join(", ")}`); process.exit(1); }
  const byDir = new Map<string, string[]>();
  for (const w of want) byDir.set(AGENTS[w].dir, [...(byDir.get(AGENTS[w].dir) ?? []), AGENTS[w].label]);
  const names = readdirSync(SKILLS).filter(n => existsSync(join(SKILLS, n, "SKILL.md")));
  for (const [dir, labels] of byDir) {
    mkdirSync(dir, { recursive: true });
    for (const n of names) cpSync(join(SKILLS, n), join(dir, n), { recursive: true, force: true });
    console.log(`  ✓ ${labels.join(", ")}: ${dir}`);
  }
  console.log(`\n  Installed: ${names.join(", ")}`);
  console.log("  Restart your agent so it picks them up.");
  console.log("  Claude desktop / claude.ai: upload the skill .zip files (GitHub Releases, or skills-zip/ in the kit download) under Settings → Capabilities → Skills.\n");
} else if (cmd === "new") {
  const target = positional[0];
  if (!target) { console.log('  Usage: bun kit.ts new <folder> --sector tourism-hospitality   e.g. bun kit.ts new ~/Documents/team-3 --sector tourism-hospitality'); process.exit(1); }
  const dir = expand(target);
  for (const d of ["findings", "opportunities", "hypotheses", "decisions", "sessions", "sources"]) mkdirSync(join(dir, d), { recursive: true });
  cpSync(join(KIT, "sprint.html"), join(dir, "sprint.html"));
  for (const root of [".claude", ".agents"]) cpSync(SKILLS, join(dir, root, "skills"), { recursive: true, filter: (p) => !/[\\/]assets([\\/]|$)/.test(p) });
  cpSync(join(KIT, "src", "SCHEMA.md"), join(dir, "AGENTS.md"));
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n");
  const now = new Date().toISOString();
  if (!existsSync(join(dir, "ledger.json"))) {
    const team = opt("--team") ?? "";
    await Bun.write(join(dir, "ledger.json"), JSON.stringify({ schema: "innovation-sprint-ledger/1", team: { name: team, number: "", members: [], leader: "", agreements: [] }, updatedAt: now }, null, 2) + "\n");
  }
  const sec = opt("--sector");
  if (sec) {
    const s = await readSector(sec);
    await Bun.write(join(dir, "sector.json"), JSON.stringify(s, null, 2) + "\n");
    console.log(`\n  Sector: ${s.name}`);
  }
  console.log(`\n  New team folder: ${dir}\n`);
  console.log("  Next:");
  if (!sec) console.log(`   · No sector yet. Pick one on the board, or rerun with --sector (${listSectors().join(", ") || "a pack .docx"}).`);
  console.log("   1. Open sprint.html in Chrome or Edge → storage pill → Connect a folder → pick this folder.");
  console.log("   2. Or open the folder in Claude Code, Codex, Cursor or Grok and say: Read AGENTS.md and get me started.\n");
} else if (cmd === "sector") {
  const files = positional;
  if (!files.length) { console.log("  Usage: bun kit.ts sector path/to/Sector_Exploration_Pack.docx [more.docx…]"); process.exit(1); }
  const SP = await loadPack();
  mkdirSync(SECTORS, { recursive: true });
  for (const f of files) {
    const s = await SP.fromDocx(await Bun.file(expand(f)).arrayBuffer());
    s.sourceFile = basename(f); s.parsedAt = new Date().toISOString();
    const out = join(SECTORS, s.id + ".json");
    await Bun.write(out, JSON.stringify(s, null, 2) + "\n");
    const probs = SP.check(s);
    console.log(`  ${probs.length ? "!" : "✓"} ${s.name} → sectors/${s.id}.json${probs.length ? "  (check: " + probs.join("; ") + ")" : ""}`);
    console.log(`    ${s.keyFigures.length} figures · ${s.players.length} company types · ${s.valueChain.steps.length} value-chain steps · ${s.sprint2Questions.length} Sprint 2 questions · ${s.glossary.length} glossary terms`);
  }
  console.log("\n  Run `bun run build` to bundle them into sprint.html, so teams can pick them from the board.\n");
} else if (cmd === "sectors") {
  for (const id of listSectors()) {
    const s = JSON.parse(await Bun.file(join(SECTORS, id + ".json")).text());
    console.log(`  ${id.padEnd(28)} ${s.name}`);
  }
} else {
  console.log(await Bun.file(import.meta.path).text().then(t => t.split("*/")[0].replace("/**", "").replace(/^#!.*\n/, "")));
}
