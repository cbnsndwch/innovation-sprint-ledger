---
name: opportunity-matrix
description: Take an Innovation Sprint team from research findings to one chosen business hypothesis in Workshop 1. That means listing possible opportunities (a specific friction, who has it, how it's solved today, the evidence), drafting three distinct hypotheses (customer, problem, solution, value proposition, revenue model, launch market), running the weighted decision matrix, stress-testing the hypotheses like a skeptical seed investor, recording the team's decision, and justifying the launch market with data. Use when a team says "turn our findings into opportunities", "help us write three hypotheses", "score the matrix", "challenge our ideas", "which one should we pick", "justify Miami as launch market", or "log our decision".
---

# Findings → opportunities → three hypotheses → one decision

This is the second half of Workshop 1. **The team decides; you propose and challenge.** Never shortlist, score, choose or log a decision on your own. Write those only after the team tells you what they decided.

Read `references/SCHEMA.md` (file formats), `sector.json` (the Exploration Challenge, the sector's limits, the key figures) and the team's `findings/`.

## 1 · Possible opportunities (after Sprint 2)

The Exploration Challenge asks for **one specific, evidence-backed friction experienced by a clearly defined customer**, and why it's worth solving now.

1. Start from the starred Sprint 1 factors (`"key": true`) and all Sprint 2 findings.
2. Propose 6–8 candidates. Write each to `opportunities/O-<author>-<nn>.json` (the author's next free number, see SCHEMA.md) with `title`, `friction`, `who` (specific, and how many if known), `howSolvedToday` (and what that fails to do), `whyNow` (the external factor), `evidence`, `findingIds` (only ids that exist), `origin: "ai"`, `shortlisted: false`.
3. Tests for each candidate. Say which ones fail:
   - Is it a **problem**, or just a **trend**? ("AI is growing" is a trend. "Small tour operators re-type every OTA booking into their own calendar" is a problem.)
   - Is the customer **identifiable**? Could the team find 10 of them next week?
   - Does the evidence come from the findings, or does it rest on unchecked sources only?
4. The team shortlists (`shortlisted: true`). Usually 2–4.

## 2 · Three business hypotheses

1. Draft three to `hypotheses/H-<author>-<nn>.json` from the shortlist: `customer`, `problem`, `solution`, `valueProp`, `revenueModel`, `businessModel` (B2C, B2B, B2B2C, Platform or Institutional), `whyNow`, `launchMarket`, `opportunityIds`, and `openQuestions` (start with the assumption that kills it if it's wrong). `origin: "ai"`, `scores: {}`.
2. Make them **genuinely different**: a different customer, or a different business model. Not three versions of one app. The solution can be digital, physical, in-person, financial, technological, operational or hybrid.
3. Ask the team to rewrite them in their own words. They'll have to defend every line to the jury.

## 3 · The weighted decision matrix

- Criteria and weights live in `ledger.json → matrix.criteria` (the defaults come from what the jury evaluates). If the team changes them, check that the weights add up to 100.
- Scores live on each hypothesis: `scores: { "<criterion id>": 1–5 }`. **The team scores.** If they ask, suggest a score per cell with one line of reasoning tied to their findings, and let them change it.
- Matrix score = Σ(weight × score) / (Σweight × 5) × 100.
- If the top two are within ~5 points, say so: the matrix doesn't decide, it structures the discussion.

## 4 · Stress test (before they decide)

Act as a **skeptical seed investor on the jury**. For each hypothesis: the three hardest questions, the weakest assumption and the evidence that would change your mind, who already solves this and why they haven't won. Finish with which hypothesis has the least evidence behind it. Be direct and brief. Don't pick a winner.

## 5 · The decision

The team tries for consensus. If there's none within the time available, they **vote on the matrix criteria** (program rule). Once they tell you:

1. `ledger.json → selection`: `hypothesisId`, `method` (consensus or vote), `votes` (if they voted), `rationale` (their words), `decidedAt`.
2. `decisions/D-<author>-<nn>.json`: `workshop: 1`, `step: "hypothesis"`, `decision` ("Chose H-ana-02 · … (matrix 78/100)"), `how`, `rationale`, `date`.
3. Then define the chosen idea fully: customer, problem, solution, value proposition, revenue model.

## 6 · Launch market, justified with data

The Exploration Challenge asks for an initial launch market (for example Miami/Florida or another U.S. region), **justified with data**. Compare 2–3 candidates on the size of the customer group (with a number and source), reachability, competition and risk. Write the team's choice to `launchMarket` and its justification (a figure plus its source) to `launchMarketWhy`. Add the sources to the hypothesis's `sources` with `verified: false`.

## No file access?

Give them text, then one JSON block that the board can import with **Paste AI answer** on the Opportunities or Hypotheses tab:

```json
{"opportunities":[{"title":"","friction":"","who":"","howSolvedToday":"","whyNow":"","evidence":"","findingIds":["F-ana-01"]}]}
```
```json
{"hypotheses":[{"title":"","customer":"","problem":"","solution":"","valueProp":"","revenueModel":"","businessModel":"B2B","launchMarket":"","whyNow":"","killerAssumption":""}]}
```
