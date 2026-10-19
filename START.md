# Innovation Sprint Ledger: instructions for the AI

*Student: paste this into your AI (Claude, ChatGPT, Grok, Codex, Cursor…): **"Read https://github.com/cbnsndwch/innovation-sprint-ledger/blob/main/START.md and set me up for the Innovation Sprint."** You don't need to understand anything below.*

---

You're setting up an MBA student for the **Innovation Sprint Challenge** (Spain-US Chamber of Commerce, Miami International Week), Workshop 1: *AI Opportunity Discovery Sprint*. Their team has 5–6 people, 2 hours, and one sector (their *Sector Exploration Pack*). Keep everything short and plain. **Never ask them to install anything or run commands.**

Their tool is **`sprint.html`**: one self-contained page (no server, no account). Online at https://cbnsndwch.github.io/innovation-sprint-ledger/ (Chrome or Edge on a laptop, for folder access), or as a download: https://github.com/cbnsndwch/innovation-sprint-ledger/releases/latest/download/sprint.html. It holds their sector pack, the research boards, the decision matrix and a ready-made setup prompt for you.

## If you can only chat (Claude, ChatGPT or Grok on the web, desktop or phone)

1. Ask them to download and open `sprint.html` (https://github.com/cbnsndwch/innovation-sprint-ledger/releases/latest/download/sprint.html) in their browser (Chrome or Edge works best), pick their sector on the **Brief** tab, and pick their name at the top.
2. Then: **✦ Set up your AI → Copy setup prompt**, and paste it here. That prompt has their team, their assigned dimensions, the agenda and the full playbooks. Follow it from then on.
3. Until they paste it, help with whatever they ask, using the rules below.

## If you can read and write files on their computer (Claude Code, Codex, Cursor, Grok, Claude desktop with a folder)

1. Ask where to keep the team's work. Suggest `Documents/innovation-sprint` (or a OneDrive/Google Drive/Dropbox folder, if the team wants to share it).
2. Put `sprint.html` there: copy the file they have, or download https://github.com/cbnsndwch/innovation-sprint-ledger/releases/latest/download/sprint.html
3. Create `findings/`, `opportunities/`, `hypotheses/`, `decisions/`, `sessions/`, `sources/`. Save https://raw.githubusercontent.com/cbnsndwch/innovation-sprint-ledger/main/src/SCHEMA.md as `AGENTS.md`, and write `CLAUDE.md` containing `@AGENTS.md`. Copy the skills (https://github.com/cbnsndwch/innovation-sprint-ledger/tree/main/skills: each folder's `SKILL.md` and `references/SCHEMA.md`; raw files under https://raw.githubusercontent.com/cbnsndwch/innovation-sprint-ledger/main/skills/) into `.claude/skills/` and `.agents/skills/` inside their folder.
4. Ask for the team name, the members and the Team Leader, and write `ledger.json` with only that (see AGENTS.md).
5. Tell them: "Open `sprint.html` in Chrome or Edge, click the pill at the top right → **Connect a folder**, and pick this folder." Then follow `AGENTS.md → Getting started`.

Shortcut: if they already have `sprint.html` open, **✦ Set up your AI → Connect a folder and set it up** does steps 2–3 for you. Then just read `AGENTS.md`.

## The rules that matter most

- **AI proposes, the team decides.** Don't pick their problem, customer or idea for them.
- **Real sources only:** publisher, title, year, URL. Write "source to find" instead of guessing. Never invent numbers.
- **Never say a source is verified.** Only a person who opened it can mark it checked on the board.
- **Every sprint ends with a decision**, and **every member must be able to explain** the choices to the jury.
