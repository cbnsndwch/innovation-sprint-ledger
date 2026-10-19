// bun run package → out/innovation-sprint-ledger-kit.zip (the whole kit) + out/sprint.html + out/skills-zip/<skill>.zip (Claude app upload)
// Writes zips itself (node:zlib), so it works the same on Windows, macOS and Linux.
import { $ } from "bun";
import { cpSync, mkdirSync, rmSync, readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { deflateRawSync, crc32 } from "node:zlib";
import { join, relative } from "node:path";
const ROOT = join(import.meta.dir, ".."), OUT = join(ROOT, "out"), KIT = join(OUT, "innovation-sprint-ledger-kit");
await $`bun ${join(ROOT, "scripts/build.ts")}`.quiet();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "skills-zip"), { recursive: true });
for (const f of ["README.md", "START.md", "LICENSE", "sprint.html", "kit.ts", "package.json"]) cpSync(join(ROOT, f), join(KIT, f));
for (const d of ["skills", "example", "sectors", "src", "scripts"]) cpSync(join(ROOT, d), join(KIT, d), { recursive: true });
cpSync(join(ROOT, "sprint.html"), join(OUT, "sprint.html"));

function zipDir(base: string, names: string[], out: string) {
  const files: [string, Buffer][] = [];
  const walk = (p: string) => statSync(p).isDirectory() ? readdirSync(p).forEach(n => walk(join(p, n))) : files.push([relative(base, p).replace(/\\/g, "/"), readFileSync(p)]);
  names.forEach(n => walk(join(base, n)));
  const parts: Buffer[] = [], dir: Buffer[] = [];
  let off = 0;
  for (const [name, data] of files) {
    const nb = Buffer.from(name), z = deflateRawSync(data), c = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(c, 14); lh.writeUInt32LE(z.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(c, 16); ch.writeUInt32LE(z.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, nb, z); dir.push(ch, nb); off += 30 + nb.length + z.length;
  }
  const size = dir.reduce((n, b) => n + b.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(off, 16);
  writeFileSync(out, Buffer.concat([...parts, ...dir, end]));
}
const skills = readdirSync(join(ROOT, "skills")).filter(s => existsSync(join(ROOT, "skills", s, "SKILL.md")));
for (const s of skills) zipDir(join(ROOT, "skills"), [s], join(OUT, "skills-zip", s + ".zip"));
cpSync(join(OUT, "skills-zip"), join(KIT, "skills-zip"), { recursive: true });
zipDir(OUT, ["innovation-sprint-ledger-kit"], join(OUT, "innovation-sprint-ledger-kit.zip"));
console.log("out/sprint.html · out/innovation-sprint-ledger-kit.zip · out/skills-zip/: " + skills.join(", "));
