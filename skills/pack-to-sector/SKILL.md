---
name: pack-to-sector
description: Convert a Sector Exploration Pack (the .docx, or PDF, brief that each Innovation Sprint Challenge team receives in Workshop 1) into the sector.json that the Innovation Sprint Ledger board shows on its Brief tab and uses in every research prompt. Use when a facilitator or student says "load our sector pack", "convert these packs", "make sector.json from this brief", or when the board says a pack looks incomplete.
---

# Sector Exploration Pack → sector.json

All the packs share one layout: a title block ("SECTOR EXPLORATION PACK | WORKSHOP 1", the sector name, the reference market), then numbered sections: 1 sector definition and boundaries (inside/outside table) · 2 who is in the sector and how they make money (company-type table + revenue models line) · 3 an example value chain (steps table + enabling layer) · 4 key figures (level / figure / source-and-year table) · 5 the Exploration Challenge · 6 guiding questions (PESTEL line + Sprint 2 dimension/starter-question table) · 7 a quick glossary · 8 reliable sources.

Read `references/SCHEMA.md` → *sector.json* for the fields.

## Steps

1. **Run the parser first.** It's deterministic and handles the standard layout:
   ```
   node scripts/convert.mjs path/to/Pack.docx [more.docx…] --out <folder>
   ```
   (`bun scripts/convert.mjs …` works too.) It writes `<folder>/<sector-id>.json` and reports what it found. In the kit, `bun kit.ts sector Pack.docx` does the same and writes into `sectors/`.
2. **Check the report.** Each pack should have about 8–10 key figures, 6–8 company types, 5–7 value-chain steps, **6 Sprint 2 questions** (one per dimension: ecosystem and actors, value chain, processes and frictions, existing solutions and competition, segments and needs, business models), a glossary, and sources. Anything listed under `extra` is a section the parser couldn't map.
3. **If the parser missed something** (the layout drifted, or the pack is a PDF): read the pack yourself and fill in **only** the missing fields, copying the pack's wording exactly. Don't summarise, "improve", or add figures. The key figures are the organizers' verified data, so the `figure` and `source` strings must match the pack.
4. **Put it where it's needed:**
   - for one team: save it as `sector.json` in the team folder. Or the student loads the `.docx` (or your `.json`) on the board's Brief tab: no tools needed.
   - for the whole kit (facilitator): save it as `sectors/<id>.json` and run `bun run build`. The rebuilt `sprint.html` lists the sector, so teams just pick it.
5. **Report** the sector name, the counts above, and anything you filled in by hand.

The pack deliberately **does not** identify a priority problem, customer, solution, technology or business model. Don't add any of that to sector.json.
