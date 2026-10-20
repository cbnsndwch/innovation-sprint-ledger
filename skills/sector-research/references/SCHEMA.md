# Innovation Sprint Ledger: folder format (schema `innovation-sprint-ledger/1`)

One team = one folder of plain JSON files. `sprint.html` (one self-contained page, no server) reads and writes it, and so can you. The page checks the folder every few seconds, so whatever you change shows up on the student's screen on its own.

## Getting started (agents: read this first)

When a student opens this folder and says something like "get me started":

1. Read `ledger.json` (team, members, assignments, agenda) and `sector.json` (their Sector Exploration Pack). Ask their name if you don't know it. It goes in `author` and in the ids you create.
2. Use the skills in `.claude/skills/` or `.agents/skills/` if your app hasn't loaded them already: `sprint-ledger` ("where are we?"), `sector-research` (Sprints 1 and 2), `opportunity-matrix` (opportunities → hypotheses → matrix → decision), `workshop-handoff` (closing the session, Workshop 2 brief).
3. Say in one line where the team is (the first Workshop 1 step that isn't done, see the table below) and offer the next step. Keep it short: they're in a timed workshop.
4. They see your changes on their board (`sprint.html`, opened in Chrome or Edge and connected to this folder) within a few seconds.

This is the team's working record for the **Innovation Sprint Challenge** (Spain-US Chamber of Commerce, Miami International Week). Workshop 1, *AI Opportunity Discovery Sprint*, takes the team from a sector to one chosen business hypothesis:

| Step | Program | Files |
|---|---|---|
| Kick-off | Team Leader, how we'll work, who takes which dimension | `ledger.json → team, assignments` |
| Sprint 1 · PESTEL | Each person takes one dimension. The team stars the key external factors | `findings/` with `"sprint": "pestel"`, `"key": true` |
| Sprint 2 · How the sector works | Each person takes one dimension. The team lists possible opportunities | `findings/` with `"sprint": "sector"`, `opportunities/` |
| Three hypotheses + weighted matrix | Compare, decide by consensus or a vote on the matrix criteria | `hypotheses/`, `ledger.json → matrix, selection`, `decisions/` |
| Close | Decisions on record, handoff to Workshop 2 (Go to Market and Brand) | `decisions/`, `sessions/` |

```
<team folder>/
  ledger.json                team, agenda + shared timer, assignments, matrix criteria, selection
  sector.json                the team's Sector Exploration Pack, parsed (read-only for students)
  findings/F-ana-01.json     one research finding per file (Sprint 1 and Sprint 2)
  opportunities/O-ben-01.json  one possible opportunity per file
  hypotheses/H-carla-01.json   one business hypothesis per file, with its matrix scores
  decisions/D-carla-01.json    one team decision per file
  sessions/2026-10-20.json   one end-of-session handoff per date
  sources/                   original files (the pack .docx, screenshots)
  AGENTS.md                  this file   ·   CLAUDE.md → points here
  .claude/skills/, .agents/skills/   the five skills (the board writes them: ✦ Set up your AI)
```

Students may each keep their own copy of the team's work and merge them (the board's **⇄ Share**), or connect the same OneDrive/Google Drive/Dropbox folder. Either way, ids carry the author's name, so work from different people never collides.

## Rules for editing

1. **Valid JSON only.** Two-space indent, UTF-8, a trailing newline. If a file won't parse, the board shows a warning and skips it.
2. **The file name is the id, and ids carry their author.** `findings/F-ana-03.json` must contain `"id": "F-ana-03"`. The pattern is `<letter>-<author>-<nn>`: `F` findings, `O` opportunities, `H` hypotheses, `D` decisions. `<author>` is the person's first name in lowercase ASCII (`José` → `jose`), or `team` if nobody is named. `<nn>` is two digits and goes up by one **per author**: take the highest existing `F-ana-…` and add one. Sessions use the date `YYYY-MM-DD`. Never rename an existing id, because other files point to it.
3. **Edit, don't rewrite.** Change only the fields you mean to change. Keep unknown fields. Set `updatedAt` to the current ISO time: when teammates merge their work, the newer edit of an item wins.
4. **The team decides; AI proposes.** Don't star key factors, shortlist opportunities, score the matrix, choose a hypothesis or log a decision unless the team told you what they decided. You can *suggest*, in chat.
5. **Never invent evidence.** Every source must be real and checkable: publisher, title, year, URL. If you're not sure a source exists or says this, write the claim without a source and say "source to find". Never invent numbers.
6. **`verified` means a person opened the source.** Only set `"verified": true` (with `verifiedBy` and `verifiedAt`) when a named team member tells you they opened it and it says what the finding claims. You checking it yourself doesn't count. Anything you add starts with `"verified": false` and `"origin": "ai"`.
7. **Lists are arrays of short strings,** one idea per item, with no bullets or numbering inside the strings.
8. **Don't delete what the team rejected.** An opportunity they dropped stays, with `"shortlisted": false`. A hypothesis they dropped stays in the matrix. A rejected hypothesis can be hidden with `"archived": true`.

## ledger.json

(The `//` comments below explain the fields. Real files can't contain comments.)

```json
{
  "schema": "innovation-sprint-ledger/1",
  "team": {
    "name": "Team 3",
    "number": "3",
    "members": [{ "name": "Ana" }, { "name": "Ben" }],   // 5 or 6 people
    "leader": "Ana",                                      // the Team Leader: talks to facilitators, keeps time. Not the boss.
    "agreements": ["We decide by consensus; if we can't in 3 minutes, we vote with the matrix criteria."]
  },
  "workshop": {
    "current": 1,
    "agenda": [ { "id": "pestel", "label": "Sprint 1 · PESTEL research", "minutes": 15, "tab": "pestel" } ],   // 120 minutes in total
    "timer": { "blockId": "pestel", "startedAt": "2026-10-20T14:10:00Z" }   // shared countdown; blockId "" = not started
  },
  "assignments": {
    "pestel": { "political": "Ana", "economic": "Ben", "social": "", "technological": "", "environmental": "", "legal": "" },
    "sector": { "ecosystem": "", "valuechain": "", "frictions": "", "competition": "", "segments": "", "models": "" }
  },
  "matrix": {
    "scale": 5,                                  // scores are 1 (weak) to 5 (strong); 0 or missing = not scored
    "criteria": [ { "id": "evidence", "label": "Evidence the problem is real", "weight": 25, "hint": "…" } ]   // weights add up to 100
  },
  "selection": {
    "hypothesisId": "H-carla-01",                        // the chosen hypothesis, "" until the team decides
    "method": "consensus",                       // consensus | vote
    "votes": { "Ana": "H-carla-01", "Ben": "H-ana-01" },       // only if they voted
    "rationale": "Strongest evidence and a customer we can reach in Miami.",
    "decidedAt": "2026-10-20T15:45:00Z"
  },
  "updatedAt": "…"
}
```

Default matrix criteria (the team can rename, reweight, add or remove them): evidence the problem is real 25 · clear, reachable customer 15 · size of the opportunity 15 · why now 10 · someone will pay 20 · feasible to launch 15. Matrix score = Σ(weight × score) / (Σweight × scale) × 100.

## sector.json (the Sector Exploration Pack)

Made by the board (Brief tab → Load a pack .docx), by `bun kit.ts sector pack.docx`, or by the `pack-to-sector` skill. Students read it, they don't edit it. Fields: `schema: "sector-pack/1"`, `id`, `name`, `referenceMarket`, `intro`, `definition`, `inside[]`, `outside[]`, `boundaryRows[{label, items}]` (other rows of the limits table, e.g. "Rules of the game"), `players[{type, howMoney, examples}]`, `revenueModels[]`, `valueChain{note, steps[{name, actors}], enablingLabel, enabling[]}`, `keyFigures[{level, figure, source}]`, `figuresNote`, `challenge`, `pestelNote`, `sprint2Questions[{dimension, question}]`, `glossary[{term, def}]`, `sources[{group, items[]}]`, `extra[{title, blocks}]` (sections it couldn't map).

The pack gives a common starting point. **It doesn't choose the problem, customer, solution, technology or business model.** The team does.

## findings/F-ben-01.json

```json
{
  "id": "F-ben-01",
  "sprint": "pestel",            // pestel | sector
  "dimension": "economic",       // pestel: political | economic | social | technological | environmental | legal
                                 // sector: ecosystem | valuechain | frictions | competition | segments | models
  "author": "Ben",               // the team member who owns it (who researched it, or who asked the AI)
  "title": "International arrivals fell in 2025 while domestic travel held",   // one-line headline
  "detail": "68.3M international arrivals in 2025 vs 72.4M in 2024; NTTO projects ~70.5M in 2026.",
  "whoAffected": "Operators that depend on overseas visitors",
  "implication": "Revenue mix is shifting; operators look for ways to win domestic or Latin American demand.",
  "sources": [
    { "label": "NTTO, International Visitor Arrivals", "url": "https://…", "year": "2026",
      "verified": false, "verifiedBy": "", "verifiedAt": null,
      "pack": false }            // true = cited from the Sector Exploration Pack's key figures (already checked by the organizers)
  ],
  "origin": "team",              // team | ai
  "key": false,                  // Sprint 1 only: the team starred it as a key external factor
  "notes": "",
  "createdAt": "…", "updatedAt": "…"
}
```

## opportunities/O-ana-01.json

A specific friction for a clearly defined customer. Not a trend, and not yet a solution.

```json
{
  "id": "O-ana-01",
  "title": "Cruise passengers' dead time on embarkation day",
  "friction": "What goes wrong, or costs time, money or trust",
  "who": "Who experiences it, as specifically as possible, and how many",
  "howSolvedToday": "Workarounds and competitors, and what they fail to do",
  "whyNow": "The external factor (Sprint 1) that makes it urgent",
  "evidence": "Data, reviews, reports, in words",
  "findingIds": ["F-ben-03", "F-carla-01"],
  "sources": [],
  "author": "Ana", "origin": "team",
  "shortlisted": false,          // the team shortlisted it for the hypotheses
  "createdAt": "…", "updatedAt": "…"
}
```

## hypotheses/H-ana-01.json

```json
{
  "id": "H-ana-01", "order": 1,
  "title": "Working name",
  "customer": "", "problem": "", "solution": "", "valueProp": "", "revenueModel": "",
  "businessModel": "B2B",        // B2C | B2B | B2B2C | Platform | Institutional | ""
  "whyNow": "",
  "launchMarket": "Miami-Dade",  // the Exploration Challenge asks for an initial launch market…
  "launchMarketWhy": "",         // …justified with data: a figure and its source
  "openQuestions": ["assumptions that must be true and aren't proven yet"],
  "opportunityIds": ["O-ana-01"],
  "sources": [],
  "scores": { "evidence": 4, "customer": 3 },   // matrix scores by criterion id, set by the TEAM
  "author": "", "origin": "team", "archived": false,
  "createdAt": "…", "updatedAt": "…"
}
```

## decisions/D-carla-01.json

Every sprint closes with a concrete decision.

```json
{ "id": "D-carla-01", "workshop": 1, "step": "pestel",   // pestel | sector | opportunities | hypothesis | team | other
  "decision": "Key external factors: …", "how": "consensus", "rationale": "", "votes": { "Ana": "H-carla-01" },
  "date": "2026-10-20", "by": "Ana", "createdAt": "…", "updatedAt": "…" }
```

## sessions/2026-10-20.json (end-of-session handoff)

```json
{
  "id": "2026-10-20", "date": "2026-10-20", "workshop": 1, "title": "Workshop 1 · Opportunity Discovery",
  "decided": "What the team decided: the idea, the customer, the launch market",
  "evidenceGaps": "One per line: what we assumed but haven't proven",
  "questionsForNext": "One per line: what to ask in Workshop 2",
  "nextTask": "Before the next workshop, who does what",
  "notes": "", "updatedAt": "…"
}
```

## No file access? Hand back JSON

In a chat app you can't write files. Instead, finish your answer with one JSON block that the board's **Paste AI answer** buttons read: `{"findings":[…]}` on a research card, `{"opportunities":[…]}` or `{"hypotheses":[…]}` on those tabs (the skills show the exact shapes). The board assigns the ids.

For anything else (several kinds of files at once), give one block in the board's sharing format. The student pastes it into **⇄ Share → Add a teammate's work**:

```json
{ "schema": "innovation-sprint-ledger/1", "from": "Claude", "files": { "findings/F-ana-07.json": { … }, "decisions/D-ana-02.json": { … } } }
```
