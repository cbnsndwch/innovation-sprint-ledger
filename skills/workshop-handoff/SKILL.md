---
name: workshop-handoff
description: Close an Innovation Sprint workshop session and prepare the next one. Log sprint decisions, write the end-of-session handoff (what we decided, evidence still missing, questions for the next workshop, who does what before then), produce the Workshop 1 summary that feeds Workshop 2 (Go to Market and Brand Sprint), outline the at most 4 Workshop 1 slides of the 12-slide pitch, and run a jury drill so every team member can explain the project. Use when a team says "close the sprint", "log our decision", "wrap up the session", "what do we bring to Workshop 2", "outline our slides", "quiz me like the jury", or "where did we leave off?" at the start of the next workshop.
---

# Close the session → hand off to the next workshop

Program rules that drive this skill:

- **Every phase closes with concrete decisions.** No extending a block to perfect it.
- **Every member must be able to explain** the problem, the value proposition, the business model, the commercial strategy and the main assumptions. The jury can question anyone.
- The final deck is **max 12 slides** for an **8-minute** pitch (3 presenters) plus 5 minutes of jury questions. Each workshop contributes about 4 slides.

Read `references/SCHEMA.md`, `ledger.json`, `decisions/`, the chosen hypothesis (`ledger.json → selection.hypothesisId`), and the newest file in `sessions/`.

## Log a decision

When the team tells you what it decided (closing Sprint 1, Sprint 2, or the hypothesis choice), write `decisions/D-<author>-<nn>.json` (the author's next free number, see SCHEMA.md): `workshop`, `step`, `decision` (in their words), `how` (consensus or vote), `rationale`, `date`, `by`. Don't log decisions they didn't make.

## End-of-session handoff

Write `sessions/<YYYY-MM-DD>.json` (update it if it exists). Ask for anything you don't know, in **one** message:

- `decided`: the idea, the customer, the launch market, in two or three lines
- `evidenceGaps`: one per line. What they assumed but haven't proven. Include unchecked sources (`verified: false`) that the decision relies on.
- `questionsForNext`: one per line. What to ask the next workshop's expert.
- `nextTask`: who does what before the next workshop. Names, and one specific task each. "Research more" is too vague; "Ana: confirm the GMCVB 2025 visitor-spending figure" is right.

Echo the four lines back so they can screenshot them.

## Workshop 1 → Workshop 2 brief

Workshop 2 is the **Go to Market and Brand Sprint**: a marketing expert explains the essentials of a marketing plan, then the team runs the **AI Brand Studio** (name, tagline, logo) and the **Marketing and Acquisition Funnel**. Produce a one-page brief containing:

1. The chosen idea: customer, problem, solution, value proposition, revenue model, business model, launch market and why
2. Why this idea: the matrix scores of all three hypotheses and how the team decided
3. The key external factors (starred PESTEL findings) and the evidence behind the problem, each marked checked or unchecked
4. What Workshop 2 will need that's still missing: customer detail, channels, competitors' positioning
5. Open questions and evidence gaps

The board's **Copy Workshop 2 brief** button produces the same thing. If the board is open, point them to it instead of retyping.

## Slide outline (at most 4 Workshop 1 slides)

Propose at most 4 slides. For each: a **headline that states a conclusion** (not a topic: "Cruise passengers lose 4 hours on embarkation day" rather than "The problem"), the **one** number or piece of evidence that proves it (only from their material), and what to leave out. A typical set: the problem and its evidence · the customer and the launch market · why this opportunity (vs. the other two) · the solution and value proposition.

## Jury drill

Quiz **one** team member at a time: 5 questions, one per message, about the problem, the customer, the evidence, why this idea over the other two, and the launch market. After each answer, give one line on clarity and brevity. If they don't know, coach them to say so honestly and to explain how they'd find out (the program asks for exactly that).

## "Where did we leave off?" (start of the next workshop)

Read the newest session file. Lead with the `decided` line, then `nextTask` (and ask whether it got done), then `evidenceGaps`. Recommend one thing to do first.
