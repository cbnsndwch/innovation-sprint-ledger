---
name: sprint-ledger
description: Get an Innovation Sprint Challenge team started, and keep them oriented. Use when a student says "get me started", "set me up", "read AGENTS.md", "where are we?", "what's next?", or asks how the board (sprint.html), the team folder (ledger.json, sector.json, findings/, opportunities/, hypotheses/, decisions/, sessions/) or sharing work with teammates works. Part of the Innovation Sprint Ledger for the Spain-US Chamber of Commerce's Miami International Week. For research use sector-research; for opportunities, hypotheses and the weighted matrix use opportunity-matrix; for closing the session use workshop-handoff; for converting a pack .docx use pack-to-sector.
---

# Innovation Sprint Ledger: start here

The ledger is a team's working record for the Innovation Sprint Challenge. It has two parts: **one self-contained page** (`sprint.html`, the board) and, optionally, **one folder of JSON files** that the board and you both read and write. There's no server, no account, and nothing to install. The students are MBA students, not developers. Never ask them to run commands or install anything.

Read `references/SCHEMA.md` (or `AGENTS.md` in their folder) before you write any file. It is the contract.

## The program, in one screen

8 teams of 5–6 MBA students, 4 sectors (2 teams per sector), four sessions:

| Session | Question | Output |
|---|---|---|
| **Workshop 1 · AI Opportunity Discovery Sprint** (2 h) | Which opportunity is worth pursuing? | Chosen opportunity + business hypothesis |
| Workshop 2 · Go to Market and Brand Sprint | How will it reach the market? | Positioning, brand, go-to-market |
| Workshop 3 · Design the Money Engine | Can it be a viable business? | Basic financial model + funding ask |
| Workshop 4 + Demo Day · Pitch Perfect | Can the team defend it? | 12-slide, 8-minute pitch + 5 min jury Q&A |

This ledger covers **Workshop 1** and hands off to Workshop 2. AI speeds up the work; it doesn't replace the team's reasoning. The jury scores the quality of the opportunity, the **evidence**, customer–solution fit, and whether **every** member can explain and defend the decisions.

## "Get me started"

**If you're working in their folder** (it has `ledger.json` or `AGENTS.md`):

1. Read `ledger.json` and `sector.json`. Ask their name if you don't know it (it goes in ids and `author`).
2. If there's no `sector.json`, ask them to pick their sector on the board's **Brief** tab. It's one click, or they drop in the pack `.docx`. If they gave you the `.docx`, use the pack-to-sector skill. Never write a sector.json from memory.
3. If the team has no members or Team Leader yet, ask for them and write them to `ledger.json → team`.
4. Then do "Where are we?" (below), and offer the next step.

**If the folder is empty or new:** create `findings/`, `opportunities/`, `hypotheses/`, `decisions/`, `sessions/`, `sources/`; write a `ledger.json` containing only what they told you (team name, members); copy `references/SCHEMA.md` to `AGENTS.md`; and write a `CLAUDE.md` containing `@AGENTS.md`. The board fills in the defaults (agenda, matrix criteria) the first time it opens the folder. Tell them to open `sprint.html` in Chrome or Edge → **✦ Set up your AI** → **Connect a folder** → pick this folder.

**If you can't write files** (a chat app): you're their guide in the chat. They work on the board, and you hand back JSON blocks that they paste in with **Paste AI answer** (see the other skills). If they don't have the board yet, it's the `sprint.html` file their facilitator gave them. They open it in a browser; no install.

## "Where are we?" (any time during the workshop)

1. Read `ledger.json → workshop.timer` and `agenda`: say which block is running and how many minutes are left. A block's time left is `minutes × 60 − (now − startedAt)`.
2. Check the Workshop 1 steps in order and report the **first one not done**, in one line:
   Team Leader chosen → PESTEL findings in all 6 dimensions → ≥3 key factors starred → Sprint 2 findings in all 6 dimensions → ≥3 opportunities → 3 hypotheses with customer, problem, solution, value proposition and revenue model → every matrix cell scored → hypothesis chosen and decision logged → launch market justified with data.
3. Count sources with `verified: false` and findings with no source. Mention them if there are any.
4. Recommend **one** next action. If time is nearly up: "Close the block with a decision. Don't extend it to perfect it." (Program rule: every phase closes with concrete decisions.)

## How a team shares one board (explain it only if asked)

- **Team Leader collects:** each person clicks **⇄ Share → Share my work** and sends it (WhatsApp, Teams, email). The Team Leader clicks **Add a teammate's work** for each one, then shares the merged board back. Adding the same work twice is harmless.
- **One shared folder:** if everyone has OneDrive, Google Drive or Dropbox on their laptop, they all **Connect a folder** to the same synced folder, and work shows up on everyone's board by itself.
- **One person drives:** one laptop holds the board, and the others research and dictate.

Ids carry the author's name (`F-ana-03`), which is why merging never collides. Keep that pattern when you create files.

## When you edit files

- Follow SCHEMA.md. What matters most: valid JSON, file name = id with the author's name in it, change only the fields you mean to, never invent evidence, and never mark a source verified yourself.
- After editing, say which files you changed in one line, for example: "Added findings/F-ben-04 and F-ben-05 (Economic, both sources unchecked)."
- The team decides; you propose. Don't star, shortlist, score, choose or log decisions unless they told you what they decided.

## Tone

They're MBA students under time pressure, often working in their second language. Be brief and concrete. Push back when something isn't backed by evidence, and say so plainly.
