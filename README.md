# Innovation Sprint Ledger

**Your team's board for the Innovation Sprint Challenge · Spain-US Chamber of Commerce · Miami International Week**

One file. No install, no account, no server. Your AI does the setup.

---

## 🚀 Students: start here

> [!IMPORTANT]
> **Use Google Chrome or Microsoft Edge on a laptop.** Saving your work to a folder (so AI agents can read it) only works in those two browsers. Safari, Firefox and phones can open the board, but your work then stays inside that browser only.

### 1 · Open the board

Pick one. It's the same board either way.

| | |
|---|---|
| 🌐 **Use it online** | **[cbnsndwch.github.io/innovation-sprint-ledger](https://cbnsndwch.github.io/innovation-sprint-ledger/)** |
| ⬇ **Or download it** | **[Download sprint.html](../../releases/latest/download/sprint.html)**, then open it from your Downloads folder. It also works offline. |

<sub>Your work is saved in the browser where you opened the board, so keep using the same one. The online board and the downloaded file keep separate copies. To move work between them, use **⇄ Share**.</sub>

New here? Click **? Tour** (top right) for a 2-minute walkthrough of the board.

### 2 · Pick your sector and your name

- **Brief** tab → click your sector.
- Top right → **Who are you?** → your name. *(Not listed yet? Your Team Leader adds everyone on the **Team** tab.)*

### 3 · Set up your AI

Click **✦ Set up your AI** → **Copy setup prompt**. Paste it into a new chat in **Claude, ChatGPT or Grok** (web, desktop app or phone) and send it.

Your AI now knows your team, your sector, your dimension and today's agenda. It tells you what to do next, one step at a time.

> **Shortcut.** Already chatting with an AI that can open links? Paste this:
>
> ```
> Read https://github.com/cbnsndwch/innovation-sprint-ledger/blob/main/START.md and set me up for the Innovation Sprint.
> ```

---

## During Workshop 1 (2 hours)

The **Sprint clock** at the top of the board runs the agenda. Each tab is one step:

| When | Tab | What you do |
|---|---|---|
| 0:00 | **Team** | Pick a Team Leader. Click **Share out** to give everyone a PESTEL dimension and a sector dimension. |
| 0:10 | **1 · PESTEL** | On **your** card: **Copy research prompt** → paste it into your AI → **Paste AI answer**. Then ★ the key factors as a team. |
| 0:35 | **2 · Sector** | Same thing, for your sector dimension. |
| 0:55 | **Opportunities** | Turn the findings into frictions: who has the problem, how it's solved today, the evidence. Shortlist 2–4. |
| 1:10 | **Hypotheses** | Write three hypotheses, score them in the **matrix**, **Copy "challenge us" prompt**, then **Decide**. Add the launch market, with data. |
| 1:55 | **Handoff** | Log the handoff. **Copy Workshop 2 brief** for next time. |

**Two rules the jury cares about:**

- ✅ **Check your sources.** Whatever the AI finds comes in marked *unchecked*. Open the link yourself. If it really says that, click **I checked it**. The **Evidence** tab shows what's left.
- 🗣️ **Everyone must be able to explain the decision.** Use **Copy jury drill prompt** on the Handoff tab to practise.

## Working as a team

Everyone uses their own copy of `sprint.html` on their own laptop.

1. Every so often, each person clicks **⇄ Share → Share my work** and sends it to the **Team Leader** (WhatsApp, Teams or email: a file, or copied text).
2. The Team Leader clicks **⇄ Share → Add a teammate's work** for each one. Then they **Share my work** back to everyone, and the whole team has the full board.

Nothing gets lost or duplicated. Adding the same work twice is harmless.

<sub>Everyone on OneDrive, Google Drive or Dropbox? Make one shared folder, and have everyone click the pill at the top right → **Connect a folder** → pick it. Then work shows up on everyone's board by itself.</sub>

## Problems?

| | |
|---|---|
| My work disappeared | It's saved in the browser you used, and the online board and the downloaded file keep separate copies. Go back to the **same browser** and the **same board** (online or file). To be safe, **Share my work** now and then, and keep the file. |
| There's no "Connect a folder" / a yellow notice says to use Chrome or Edge | Your browser can't save to folders. Switch to **Chrome or Edge on a laptop**. Until then, everything else works, and **⇄ Share** still moves your work. |
| The tour doesn't start | It needs an internet connection. Everything else works offline. |
| The AI's answer didn't import | Ask it: *"Finish with the JSON block from the prompt."* Then paste the whole answer again. |
| The AI invented a source | Delete it, or keep the finding with no source. The board flags findings with no source. |
| I use Claude Code, Codex, Cursor or Grok | **✦ Set up your AI → Connect a folder and set it up**. Open that folder in your agent and say *"Read AGENTS.md and get me started."* |
| I want the skills in the Claude app | **✦ Set up your AI** → download the skill zips, then in Claude go to *Settings → Capabilities → Skills → Upload*. |

<details>
<summary><b>🇪🇸 En español</b></summary>

0. **Usa Google Chrome o Microsoft Edge en un portátil.** Solo en esos navegadores se puede guardar el trabajo en una carpeta.
1. Abre el tablero **[en línea](https://cbnsndwch.github.io/innovation-sprint-ledger/)**, o **[descarga sprint.html](../../releases/latest/download/sprint.html)** y ábrelo. ¿Primera vez? Pulsa **? Tour**.
2. En la pestaña **Brief**, elige tu sector. Arriba a la derecha, en **Who are you?**, elige tu nombre.
3. Pulsa **✦ Set up your AI → Copy setup prompt** y pégalo en un chat nuevo de Claude, ChatGPT o Grok. Tu IA ya conoce a tu equipo, tu sector y la agenda, y te guía paso a paso.

En equipo: cada persona pulsa **⇄ Share → Share my work** y se lo envía al Team Leader. El Team Leader pulsa **Add a teammate's work** con cada una y luego comparte el tablero completo con todos.

Reglas: abre cada fuente antes de pulsar **I checked it**, y cualquier miembro del equipo debe poder explicar la decisión al jurado.

</details>

---

## For facilitators

`sprint.html` carries the sector packs, the five agent skills and the AI setup prompt. Hand it out as is.

**Sector packs included:** Tourism & Hospitality · Fintech & Financial Services · Health, Wellness & Longevity · Education, Talent & Future of Work. Each team picks theirs on the Brief tab.

**Adding or updating a pack** (needs [Bun](https://bun.sh), on your machine only):

```
bun kit.ts sector packs/*.docx   # each Sector Exploration Pack → sectors/<id>.json, with a report of what it found
bun run build                     # bundles every sector into sprint.html
```

Push to `main`, and the [Publish workflow](.github/workflows/publish.yml) updates both the **online board** (GitHub Pages) and the **latest** release, which is what the download link above points to. Students can also drop a pack `.docx` straight onto the Brief tab; the board reads it in the browser.

**Demo:** [`example/team-example/`](example/team-example) is a fictional team that finished Workshop 1 in Tourism & Hospitality. Download the repo, open `sprint.html`, choose **Connect a folder**, and pick that folder.

### The agent skills

| Skill | Workshop step |
|---|---|
| `sprint-ledger` | Get started, "where are we?", how sharing works |
| `sector-research` | Sprint 1 PESTEL · Sprint 2 sector, one dimension at a time, with real sources |
| `opportunity-matrix` | Opportunities → three hypotheses → weighted matrix → decision → launch market |
| `workshop-handoff` | Close the session, Workshop 2 brief, ≤4-slide outline, jury drill |
| `pack-to-sector` | Facilitator: a pack `.docx` → `sector.json` |

They follow the open [Agent Skills](https://agentskills.io) format and work in Claude, Codex, Cursor and Grok. Students get them from the board. On your own machine, `bun kit.ts skills` installs them to `~/.claude/skills` and `~/.agents/skills`.

### What the board enforces

- **AI proposes, the team decides.** Stars, shortlists, matrix scores and the final choice belong to the team.
- **A source counts as checked only after a person opens it.** The board records who checked it, and editing the source clears the check. Figures from the pack count as checked, since the organizers verified them.
- **Every sprint closes with a decision**, and the agenda clock keeps the 120 minutes honest.
- **Everyone contributes.** Findings carry their author, and the Team tab shows who did what.

### How it works

- **Format:** [`src/SCHEMA.md`](src/SCHEMA.md), written into a connected folder as `AGENTS.md`. Ids carry their author (`F-ana-03`), so merged work never collides.
- **Storage:** the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) in Chrome and Edge (the page polls file times every 2.5 s, so agent edits appear on their own), or localStorage when no folder is connected.
- **No dependencies.** Plain HTML, CSS and JS, inlined into one file. The `.docx` reader and the `.zip` writer each run on browser built-ins.

```
bun run build      # src/ + sectors/ + skills/ → sprint.html; syncs SCHEMA.md into skills/
bun run package    # out/sprint.html, out/innovation-sprint-ledger-kit.zip, out/skills-zip/*.zip
```

Edit `src/`, `skills/*/SKILL.md` and `sectors/`. The root `sprint.html` and `skills/*/references/SCHEMA.md` are generated, but they're committed.

## License

[MIT](LICENSE). The Sector Exploration Packs and program materials belong to the Spain-US Chamber of Commerce.
