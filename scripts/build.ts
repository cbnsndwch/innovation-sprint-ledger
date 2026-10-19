// bun run build
//   src/sprint.html + css/js + sectors/*.json + skills/  → sprint.html (one self-contained file)
//   src/SCHEMA.md                                         → skills/*/references/SCHEMA.md, example AGENTS.md
//   sectors/                                              → skills/sprint-ledger/assets/sectors/
import { cpSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = join(import.meta.dir, ".."), SRC = join(ROOT, "src"), SECTORS = join(ROOT, "sectors"), SKILLS = join(ROOT, "skills");
const skills = readdirSync(SKILLS).filter(s => existsSync(join(SKILLS, s, "SKILL.md")));

// 1 · sync the generated parts of the skills first, so the page embeds the current versions
for (const s of skills) {
  mkdirSync(join(SKILLS, s, "references"), { recursive: true });
  cpSync(join(SRC, "SCHEMA.md"), join(SKILLS, s, "references", "SCHEMA.md"));
}
const sectorFiles = existsSync(SECTORS) ? readdirSync(SECTORS).filter(f => f.endsWith(".json")).sort() : [];
const assets = join(SKILLS, "sprint-ledger", "assets");
rmSync(assets, { recursive: true, force: true });
mkdirSync(join(assets, "sectors"), { recursive: true });
for (const f of sectorFiles) cpSync(join(SECTORS, f), join(assets, "sectors", f));
mkdirSync(join(SKILLS, "pack-to-sector", "scripts"), { recursive: true });
cpSync(join(SRC, "pack.js"), join(SKILLS, "pack-to-sector", "scripts", "pack.js"));
if (existsSync(join(ROOT, "example"))) for (const d of readdirSync(join(ROOT, "example"))) cpSync(join(SRC, "SCHEMA.md"), join(ROOT, "example", d, "AGENTS.md"));

// 2 · every skill file as text (assets/ stays out: the page already carries the sector packs)
const skillFiles: Record<string, string> = {};
const walk = (dir: string) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== "assets") walk(p); }
    else skillFiles[relative(SKILLS, p).replace(/\\/g, "/")] = readFileSync(p, "utf8");
  }
};
walk(SKILLS);

// 3 · the page
const sectors = sectorFiles.map(f => JSON.parse(readFileSync(join(SECTORS, f), "utf8")));
const safe = (v: unknown) => JSON.stringify(v).replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const html = readFileSync(join(SRC, "sprint.html"), "utf8")
  .replace(/\/\*@(CSS|JS) ([\w.-]+)\*\//g, (_, _k, f) => readFileSync(join(SRC, f), "utf8").replace(/<\/script/gi, "<\\/script"))
  .replace("/*@SECTORS*/[]", () => safe(sectors))
  .replace("/*@SKILLS*/{}", () => safe(skillFiles));
await Bun.write(join(ROOT, "sprint.html"), html);
console.log(`built sprint.html (${(html.length / 1024).toFixed(0)} KB · ${sectors.length} sector pack${sectors.length === 1 ? "" : "s"}: ${sectors.map(s => s.name).join(", ")} · ${skills.length} skills, ${Object.keys(skillFiles).length} files)`);
