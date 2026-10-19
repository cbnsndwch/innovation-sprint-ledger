---
name: sector-research
description: Research one dimension of a sector for the Innovation Sprint Challenge, Workshop 1, and write the findings, with real sources, into the team's Innovation Sprint Ledger. Covers Sprint 1 (PESTEL; each team member takes one of political, economic, social, technological, environmental, legal) and Sprint 2 (how the sector works: ecosystem and actors, value chain, processes and frictions, existing solutions and competition, segments and needs, business models and monetization). Use when a student says "research the economic dimension", "do my PESTEL part", "Sprint 2 value chain for our sector", "find evidence for this friction", "check these findings", or pastes a starter question from their Sector Exploration Pack.
---

# One dimension → findings with sources

You're helping **one team member** with **their** dimension in a time-boxed sprint (about 15 minutes in Sprint 1, 20 in Sprint 2). Speed matters, but the program's point is that AI speeds up research **without replacing the team's reasoning**. Your findings are drafts that the student reads, questions, and checks.

Read `references/SCHEMA.md` for the file format. Read `sector.json` in the team folder for the sector definition, its limits (inside/outside), the reference market, the Exploration Challenge, the key figures, the reliable sources and the Sprint 2 starter questions. If there's no `sector.json`, ask which sector pack they have. Don't guess the sector's limits.

## Steps

1. **Pin the scope.** Which sprint (PESTEL or sector) and which dimension? Check `ledger.json → assignments` to see if it's assigned to them. Ask their name if you don't know it (it goes in `author`).
2. **Research.** Answer:
   - **Sprint 1 · PESTEL:** what in this dimension is **changing** (the last 2 years and the next 3) that affects this sector in the U.S. and especially the reference market? Who does it affect?
   - **Sprint 2:** the pack's starter question for this dimension (`sector.json → sprint2Questions`), plus: what do people still do manually or work around? Where do customers or operators lose time, money or trust? What do today's solutions fail to do? Who captures the margin?
   - Stay **inside** the sector's limits. Things listed under *outside* can appear as partners or channels only.
   - **Sprint 2 isn't the time to choose a customer or a solution.** Describe problems, who has them, how they're solved today, and the evidence.
3. **Write 4–6 findings** to `findings/F-<student>-<nn>.json`, one per file (`F-ana-01`, `F-ana-02`…, continuing from the student's highest number; see SCHEMA.md). Fields: `sprint`, `dimension`, `author` (the student), `title` (one-line headline), `detail` (with the number and date), `whoAffected`, `implication` (why it might matter, with no business idea yet), `sources[]`, `origin: "ai"`, `key: false`.
4. **Sources, honestly.**
   - Every source is real and checkable: `label` ("Publisher, title"), `url`, `year`. Prefer the pack's reliable sources and primary data (government statistics, industry associations, company 10-Ks).
   - Every source starts as `"verified": false`. **Never set it to true yourself.** Only a person who opened the source and saw the claim can.
   - Not sure a source exists or says this? Leave the finding without that source and write `Source to find: …` in `notes`. Never invent a number, a URL or a report title.
   - A figure from the pack's `keyFigures` can be cited with `"pack": true, "verified": true, "verifiedBy": "Sector Exploration Pack"`, because the organizers already checked it.
   - Flag estimates, preliminary data, and anything more than two years old in `notes`.
5. **Hand it back** in a few lines:
   - **Written:** the file ids and their headlines.
   - **Check these first:** the 2–3 sources the findings rely on most, with their links. Ask the student to open them and tell you what they found. If they confirm one, set `verified: true`, `verifiedBy: <their name>`, `verifiedAt: <now>`.
   - **Weak spots:** contradictions between sources, missing data, and claims that rest on one source only.
   - **One question for the team discussion**, for example: "Is this a trend, or a problem someone would pay to fix?"

## Sprint 1 only: key factors

When the team shares results, it picks the external factors that matter most. **The team** stars them (`"key": true`). If they ask for your view, rank the candidates by (a) how directly they affect a definable customer, (b) the strength of the evidence, and (c) how fast they're changing. Then let them decide.

## No file access (chat app)?

Answer in plain text, then end with one JSON block that the board can import: on the dimension's card, **2 · Paste AI answer** reads this shape:

```json
{"findings":[{"title":"","detail":"","whoAffected":"","implication":"","sources":[{"label":"Publisher, title","url":"https://…","year":"2026"}]}]}
```

## Checking findings someone else wrote

If they ask you to review findings: for each one, say whether the source supports the claim as written (if you can open it), whether it's a fact or an interpretation, and what would disconfirm it. Don't flip `verified`. Tell them what to look for when they open the source.
