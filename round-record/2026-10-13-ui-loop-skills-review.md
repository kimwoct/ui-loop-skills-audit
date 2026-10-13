# Review: ui-fix-loop · ui-verify-loop · ui-logic-loop

Reviewer: Claude (review and suggestion only — no skill file was changed).
Date: 2026-10-13.
Files reviewed (live, at the time of review):

| Skill | Path | Words |
|---|---|---|
| ui-fix-loop | `~/.agents/skills/ui-fix-loop/SKILL.md` (116 lines) | 2,716 |
| ui-verify-loop | `~/.agents/skills/ui-verify-loop/SKILL.md` (70 lines) | 1,530 |
| ui-logic-loop | `~/.agents/skills/ui-logic-loop/SKILL.md` (74 lines) | 1,602 |

Lenses: Karpathy-style agentic coding (small steps, fast human verification, explicit success
criteria, context engineering, memory), HTML as the verification surface, environment pinning,
end-to-end proof, memory, prompt engineering, and ASD-STE100 as the controlled language.

Note on sources. The Karpathy points below are my paraphrase of his public talks and posts
(generation–verification loop, "keep the AI on a leash", autonomy slider, context engineering,
LLMs without continual learning). They are not quotes. The `karpathy-guidelines` skill in
`~/.agents/skills/` is the local, concrete version and is cited where it applies.

---

## 1. Verdict

The loops have the right spine: a human-approved preview before code, live evidence after
code, deployed evidence before "fixed", and no silent defaults. That spine is good and you
should keep it.

The weak points are structural, not conceptual:

1. The same contracts appear three times in different words, so they drift.
2. Machine-specific setup facts sit inside the workflow, so every round loads ~1,000 words it
   does not need.
3. Evidence is prose. Nothing can check it automatically, and the walkthrough cannot run.
4. The deployed check does not prove the deployed build contains the merged change.
5. The language is dense: many sentences have 40–110 words with nested dashes and brackets.
   Agents follow short, single-instruction sentences more reliably.

---

## 2. Scorecard

Scale: 1 = missing, 3 = present but loose, 5 = solid.

| Dimension | Score | Reason |
|---|---|---|
| Agentic coding (small steps, approval, leash) | 4 | Preview gate, numbered answers, worktree + PR per round. Missing: size tiers for the "use judgment" escape. |
| HTML as verification surface | 4 | One HTML canvas per issue, approval widget, decision API. Mixed with server ops detail. |
| Verification | 3 | Live + deployed evidence demanded. No per-issue record, no machine check, no build identity. |
| Environment | 2 | Env named by the user, but not pinned (URL, build SHA, role, seed data). |
| E2E | 3 | Walkthrough replay is required, but it is prose, not a runnable script. |
| Memory | 1 | One phrase: "update memory" (verify L49). No what/where/when. |
| Prompt engineering / context | 2 | Triplicated contracts, long sentences, infra facts always loaded. |
| Controlled language (STE) | 1 | Not applied yet. |

---

## 3. Findings

Severity: High = causes wrong agent behavior now; Medium = weakens proof or adds drift; Low = clarity.

### F1 · High · Three copies of the agent-selection contract

- `ui-fix-loop` L12–22, `ui-verify-loop` L12–18, `ui-logic-loop` L14–20.
- Each copy paraphrases the rules differently. Today's concurrent edits show the risk:
  two agents edited these files within 20 minutes of each other.
- **Suggest:** one owner. Put the shared contracts in one file (see §4). The loops keep one
  line: "Apply core §Dispatch."

### F2 · High · The element-access gate is missing from the canonical gate

- `ui-verify-loop` L29–33 and `ui-logic-loop` L35–38 define the gate.
- `ui-fix-loop` Phase 2 (L67–90) and Phase 3 step 3 (L106) do not mention it. `ui-fix-loop`
  is the usual entry point for a UI fix, so a fix-only round skips the gate.
- **Suggest:** define the gate once in core. Reference it from all three Phase-2 and
  live-evidence steps.

### F3 · High · Environment facts live inside the workflow

- `ui-fix-loop` L35–55: launchd label, port 8791, Tailscale host name, Conductor token path,
  `/login` quirks, dispatch-watcher `REPOS` map. About 1,000 words, loaded on every round.
- These are facts about one machine, not instructions. They go stale and push the workflow
  out of the agent's attention (context engineering).
- **Suggest:** move them to `references/canvas-server.md` and `references/conductor.md`.
  The skill body says when to read each file ("Before you serve a canvas, read
  references/canvas-server.md").

### F4 · High · The deployed check does not prove the build

- `ui-verify-loop` L45–46 and `ui-logic-loop` L62–63 replay the walkthrough on the deployed
  env. Nothing checks that the env runs the merged commit. A stale deploy passes the replay
  against old code, or fails it for the wrong reason.
- **Suggest:** before the replay, record the env's build identity (version endpoint, image
  tag, or commit SHA) and confirm it contains the merge commit. If you cannot read the
  build identity, the round is BLOCKED, not FIXED.

### F5 · Medium · The walkthrough cannot run

- The walkthrough is a numbered prose list (verify L31, logic L37). Each replay is manual,
  so local and deployed replays can differ.
- Karpathy point: make verification fast and cheap for the human and the agent.
- **Suggest:** store the walkthrough twice: prose for the human, plus one runnable script
  with `BASE_URL` as a parameter. Run the same script local and deployed. Each step saves a
  screenshot named `<issue>-<step>.png`.
- **Driver choice — ego-browser or Playwright.** Both can run the script. ego-browser runs
  Node scripts against a persistent task space in the user's logged-in Ego Lite profile;
  tabs and page labels persist between invocations. Playwright runs a clean, isolated context.

  | Need | ego-browser | Playwright |
  |---|---|---|
  | Deployed env behind SSO / real login | ✅ uses the existing session | needs stored auth state or test credentials |
  | Agent drives it interactively, user can watch and take over | ✅ | weak (headless by default) |
  | Several tabs sharing one login | ✅ | possible, same context |
  | Two roles at the same time (tutor vs admin) | one login per profile; switching roles means another profile or logout | ✅ one isolated context per role |
  | Same result every run (no leftover cookies, cache, local storage) | weak — shared, long-lived state | ✅ fresh context each run |
  | Runs unattended / in CI | ❌ needs the user's desktop and profile | ✅ |

  **Recommendation:** make the *walkthrough* the source of truth and keep the driver
  replaceable:
  - **Default (T1, interactive rounds): ego-browser.** It reaches real logged-in pages on the
    deployed env with no credential handling, which is where most replays fail today.
  - **T2 (more than one role) or regression checks: Playwright**, one isolated context per role.
  - Record which driver, profile, and account ran each replay in the evidence file. A replay
    in a different session state is not the same replay.
  - Risk to state in the skill: the shared ego-browser session can hide bugs (cached data,
    a leftover flag, an admin cookie). Before the deployed replay, confirm the account role
    shown on the page matches the walkthrough's role.

### F6 · Medium · Evidence has no record format

- Evidence is canvas prose. No tool can check "every issue has deployed proof".
- **Suggest:** one JSON evidence file per round (schema in §6). The round closes only
  when a script confirms every issue has `local` and `deployed` results equal to `pass`.

### F7 · Medium · Status labels conflict

- `ui-fix-loop` L108: "report completion" when the canvas matches the local page.
- `ui-verify-loop` L8: "passes locally is IMPLEMENTED, never FIXED".
- Labels in use: `IMPLEMENTED — PR …`, `FIXED — deployed & e2e-verified`,
  `FIXED — deployed & flow-verified`, `VERIFIED — deployed & e2e-verified`.
- **Suggest:** one state machine in core (§5). `ui-fix-loop` ends at IMPLEMENTED, like the
  others.

### F8 · Medium · Memory is undefined

- `ui-verify-loop` L49: "update memory". Nothing says what to keep, where, or when.
- Karpathy point: an LLM does not learn between sessions; written memory and the skill text
  are its only learning.
- **Suggest:** a close-out step with three outputs:
  1. Memory note: one non-obvious fact (env quirk, user preference), with *why*.
  2. Skill delta: a proposed one-line skill change, shown to the user, applied only on approval.
  3. Nothing else. Do not save logs, diffs, or facts the repo already records.

### F9 · Medium · "Use judgment" has no thresholds

- `ui-fix-loop` L10, `ui-verify-loop` L10, `ui-logic-loop` L10.
- An agent cannot calibrate "trivial". This is the autonomy slider with no marks.
- **Suggest:** tiers in core:
  - **T0** — copy, constant, or style token. One surface. No layout or flow change.
    No canvas. Run checks and one live look.
  - **T1** — default. Full loop.
  - **T2** — more than one role, surface, or deployable. Full loop + walkthrough per role.

### F10 · Medium · Long sentences

- Examples: `ui-fix-loop` L40 (~110 words, one bullet), L88 (~100 words), `ui-verify-loop`
  L33 (~75 words), `ui-logic-loop` L46 (~110 words).
- **Suggest:** apply the STE rules in §7.

### F11 · Low · One concept, many names

- canvas / board / sketch / diagram pair; approval gate / PREVIEW gate / execution gate;
  reference / oracle; round / run.
- **Suggest:** a glossary in core. One term per concept (an STE rule).

### F12 · Low · Optional material in the main body

- Executor triage (`ui-fix-loop` L92–100) is optional and long.
- **Suggest:** move it to `references/executor-triage.md`.

### F13 · Low · Stale Whiteboard tool names (pre-existing)

- `ui-verify-loop` L57 names `session_source` / `session_file` / `session_diff`.
  Whiteboard 0.2.4 does not expose them.
- **Suggest:** "Read the pinned lines with git at the board's head commit."

### F14 · Low · Anti-patterns are prose, not checks

- The anti-pattern lists are the best part of the skills. Keep them.
- **Suggest:** also restate each one as a pre-close check:
  "Before you write FIXED, confirm the deployed build SHA contains the merge commit."

### F15 · Process · Two agents edited the same skills at the same time

- On 2026-10-13, the skill files and Whiteboard boards were changed by two agents at about the
  same time. One agent deleted the other's board.
- **Suggest:** add a rule to core: one editor per skill file at a time. Before an edit, the
  agent records the file's SHA-256. Before it writes, it checks the SHA is unchanged.
  If the SHA changed, the agent stops and reports.

### F16 · Medium · Graphs are used for some artifacts, not as the default

- Graphs already appear in places: the access-path diagram (verify L30), archify sequence
  diagrams (logic L24), Whiteboard flow diagrams. They are not the default way a round
  starts, hands off, or reports.
- Source check: I could not confirm a Karpathy statement that agents should *always* use
  graphs. The closest primary source I found is his "LLM Wiki" idea file, which, according to
  coverage of it, uses a linked wiki whose graph view shows its shape (hubs, orphans). I could
  not fetch the gist itself (GitHub returned errors). Treat "graph first" as your rule, on its
  own merits, not as a quote.
- On the merits it is a strong rule: a graph makes missing edges, dead ends, and unreachable
  states visible, which prose hides. This repo already follows it with `graphify-out/`.
- **Suggest (graph-first communication):**
  1. Every canvas, diagram pair, and board starts with one graph before any prose:
     fix → access path; logic → sequence; verify → state machine position (§5).
  2. Write graphs as **text** an agent can read and diff — mermaid source or a JSON
     node/edge list — rendered for the human. An image-only graph is opaque to the next agent.
  3. Every agent handoff (dispatch prompt, PR body, review) includes the current graph.
  4. Each node that names code carries a `file:line` link (no link, no node).
  5. Use the graph as a check, not decoration: before IMPLEMENTED, every walkthrough step
     maps to a node, and every changed node has evidence.

---

## 4. Proposed structure

```text
~/.agents/skills/
  ui-loop-core/                 # NEW: owns every shared rule
    SKILL.md                    #   ≤ 1,200 words
    references/
      canvas-server.md          #   from ui-fix-loop L48–55
      conductor.md              #   from ui-fix-loop L42–46
      executor-triage.md        #   from ui-fix-loop L92–100
      whiteboard.md             #   from ui-verify-loop L51–61
      evidence.schema.json      #   §6
      walkthrough.template.mjs  #   one script, BASE_URL param; ego-browser or Playwright driver
  ui-fix-loop/SKILL.md          # pixels: canvas, mock, markers   ≤ 700 words
  ui-logic-loop/SKILL.md        # flow: trace, diagram pair       ≤ 700 words
  ui-verify-loop/SKILL.md       # reference, deploy, e2e proof    ≤ 700 words
```

`ui-loop-core` sections, in order:

1. Glossary (F11).
2. Size tiers T0–T2 (F9).
3. State machine and labels (F7, §5).
4. Approval rules: numbered questions, no silent default (now repeated in all three).
5. Element-access gate (F2, §8).
6. Dispatch: agent selection, Herdr session per run (F1).
7. Worktree and PR (`ui-fix-loop` L24–33).
8. Environment pin and build check (F4).
9. Evidence record (F6).
10. Close-out: memory note and skill delta (F8).
11. Edit safety: one editor, SHA check (F15).

If you prefer three skills only, put sections 1–11 in `ui-fix-loop` under a heading
"Shared contract". The other two skills link to it. The important part is one owner.

---

## 5. State machine

```text
DRAFT ──► REVIEW ──► PREVIEW ──► APPROVED ──► IMPLEMENTED ──► DEPLOYED ──► VERIFIED
                        ▲            │              │              │
                        └─ changes ──┘              ▼              ▼
                           requested            BLOCKED        BLOCKED
```

| State | Entry condition | Label written |
|---|---|---|
| REVIEW | Issue list (fix) or CURRENT trace (logic) exists | — |
| PREVIEW | End-state preview + numbered questions + walkthrough (if gate applies) | — |
| APPROVED | Every numbered question has an explicit answer | — |
| IMPLEMENTED | Local evidence = pass for every issue; PR base/head checked | `IMPLEMENTED — PR <url> → <parent>` |
| DEPLOYED | User asked to deploy; env build contains merge commit | — |
| VERIFIED | Deployed evidence = pass for every issue | `VERIFIED — <env> <build-sha> <date>` |
| BLOCKED | Any gate cannot be met | `BLOCKED — <reason>` |

Use one closing label for all three loops. Keep the loop type in the evidence record, not in
the label.

---

## 6. Evidence record (suggested schema)

File: `<canvas-dir>/<repo>/<issue-slug>.evidence.json`

```json
{
  "round": "jckak-e-platform/survey-email-contact-tutor",
  "loop": "fix | logic | verify",
  "tier": "T1",
  "state": "IMPLEMENTED",
  "reference": { "kind": "artifact | canvas | environment", "value": "..." },
  "walkthrough": {
    "steps": ["/dashboard", "量表追蹤", "survey row → 重寄提醒", "confirm modal"],
    "script": "walkthrough.mjs",
    "driver": "ego-browser | playwright",
    "profileOrAccount": "...",
    "role": "tutor"
  },
  "dispatch": { "agent": "pi", "runId": "...", "herdrSession": "..." },
  "pr": { "url": "...", "base": "develop", "head": "...", "mergeSha": null },
  "issues": [
    {
      "id": 1,
      "expected": "...",
      "local":    { "result": "pass", "buildSha": "...", "artifact": "1-4-local.png" },
      "deployed": { "result": null,   "env": null, "buildSha": null, "artifact": null }
    }
  ]
}
```

Close rule: a script reads this file. `VERIFIED` is allowed only when every
`issues[].deployed.result` is `pass` and `deployed.buildSha` contains `pr.mergeSha`.

---

## 7. ASD-STE100 for agent instructions

STE (ASD-STE100) is a controlled language for technical procedures. Use its **writing
rules**. Do not try to use only its approved dictionary: tool names, file paths, and
product terms are "technical names" and STE allows them.

Rules to adopt (paraphrased from the STE writing rules; check exact wording and limits against the current ASD-STE100 issue):

| # | Rule | Applied to skills |
|---|---|---|
| 1 | One term for one concept | Glossary in core (F11) |
| 2 | Procedural sentences: max 20 words | Every step line |
| 3 | Descriptive sentences: max 25 words | What/why text |
| 4 | One instruction per sentence | Split "do X, then Y, and confirm Z" |
| 5 | Imperative for instructions | "Record…", not "should be recorded" |
| 6 | Active voice | "The agent records…", not "is recorded" |
| 7 | Condition first, then instruction | "If X, do Y." |
| 8 | Vertical lists for sequences | Numbered steps, one action each |
| 9 | Warnings: command first, then reason | "Do not X. Reason: Y." |
| 10 | Max 6 sentences per paragraph | Break long bullets |
| 11 | Avoid -ing forms as nouns/modifiers | "Replay the walkthrough", not "replaying" |

Before and after (from the live files):

**Before** — `ui-verify-loop` L37 (one sentence, ~60 words):

> Follow `ui-fix-loop` phases 3+: implement, run the project's checks, capture live-page
> evidence for every issue by replaying the canvas's element-access walkthrough step by step
> when Phase 0 step 3 applies, update the canvas, loop until canvas and live page agree.

**After** (STE):

> 1. Implement the change in the worktree.
> 2. Run the project checks.
> 3. If the gate applies, run the walkthrough script on localhost.
> 4. For each issue, record the local result in the evidence file.
> 5. Update the canvas with the result.
> 6. If one or more issues fail, go back to step 1.

**Before** — `ui-fix-loop` L88 (approval rule, ~100 words).

**After** (STE):

> WARNING: Do not use a recommended answer as consent. Reason: silence is not approval.
>
> 1. Give each open decision a number.
> 2. Show the options and mark one option as recommended.
> 3. Wait for an explicit answer to each number.
> 4. If the user says "approved" but does not answer each number, list the unanswered numbers.
> 5. Ask again.

---

## 8. Example: the element-access gate, rewritten in STE

```markdown
## Element-access gate

Use this gate when the user must do UI actions to reach the target element.
UI actions are clicks, route changes, and role or state prerequisites.

Before the approval step:

1. Draw the access path. Start at the app entry. End at the target element.
2. Show each role or state prerequisite as a branch.
3. Write the walkthrough. Write one action on each line.
4. Name the exact route or control in each line.
5. Write the walkthrough script from the template. Use BASE_URL as a parameter.
6. Run the script on localhost once. Record the result.
7. If the script cannot reach the element, set the round to BLOCKED. Write the reason on the canvas.

After the approval step:

1. Use the same script for local evidence.
2. Use the same script for deployed evidence.
3. Do not change the steps between the two runs. Reason: the results must be comparable.

Example walkthrough:
1. /dashboard
2. 量表追蹤
3. survey row → 重寄提醒
4. confirm modal
```

It is longer than either current copy (145 and 122 words) because it adds the script and BLOCKED steps. It replaces both copies with one definition.

---

## 9. Implementation plan (for the coding agent)

Each step has a check. Do the steps in order. Show the result of each check.

| # | Step | Check |
|---|---|---|
| 1 | Record SHA-256 of the three SKILL.md files. Copy them to a dated backup. | Backup files exist; SHAs match. |
| 2 | Create `ui-loop-core` with sections 1–11 (§4). Use STE rules (§7). | Word count ≤ 1,200. No sentence > 25 words (script check). |
| 3 | Move infra text to `references/` (F3, F12, F13). | `grep -c 8791 ui-fix-loop/SKILL.md` = 0. |
| 4 | Thin each loop to its own surface. Replace shared text with links to core. | Each loop ≤ 700 words. `grep -l "Herdr session"` finds core only. |
| 5 | Add the gate links in `ui-fix-loop` Phase 2 and live-evidence step (F2). | `grep -n "Element-access gate"` hits all three loops. |
| 6 | Add the build-identity check before the deployed replay (F4). | Text present in core §8; linked from verify + logic deploy phases. |
| 7 | Add the evidence schema and the walkthrough template (§6, F5). | Schema validates the §6 example. Template runs with `BASE_URL`. |
| 8 | Write eval scenarios with `skill-creator` (below). | Each scenario passes in a fresh session. |
| 9 | Before each write, check the file SHA is unchanged from step 1 (F15). | No overwrite of another agent's edit. |

Eval scenarios (each one tests one rule):

1. User says "approved" with question ② unanswered → agent lists ② and waits.
2. Target element needs an admin role the test account does not have → agent sets BLOCKED before code.
3. Deployed env reports a build SHA without the merge commit → agent does not write VERIFIED.
4. T0 change (one label string) → agent skips the canvas, still runs checks and one live look.
5. Fix-only round, element behind two clicks → agent writes the walkthrough (tests F2).
6. Round close → agent proposes one memory note and one skill delta, and saves neither without approval.

---

## 10. Decisions for you

1. **Core skill or shared section?** New `ui-loop-core` skill (recommended: one owner, smaller loops), or a "Shared contract" section inside `ui-fix-loop`?
2. **Walkthrough driver?** ego-browser by default for T1 and Playwright for T2/multi-role (recommended), Playwright only, or ego-browser only?
3. **STE scope.** Apply STE rules to all skill text (recommended), or only to procedures and warnings?
4. **Skill deltas.** At close-out, may the agent propose skill edits (recommended, approval required), or memory notes only?
5. **Graph first?** Every canvas, board, and handoff starts with a text-form graph (recommended), or graphs only where a skill asks today?
6. **Who implements?** Which agent does steps 1–9, and is any other agent stopped while it runs (F15)?

---

## 11. Round log — 2026-10-13 (structural round, run run_7e04be770e5c)

The user answered all six §10 decisions (G0, recorded in `structural-round/COMMON.md`):

1. New `ui-loop-core` skill. 2. Replay driver: ego-browser for T1 rounds, Playwright for T2/multi-role. 3. STE for all skill text. 4. Close-out may propose skill edits; the user approves each. 5. Graph first everywhere. 6. Writers: Claude Opus (T1, T2), codex (T3, T4), opencode verifier (T6), Pi does the snapshot/board task (T7).

State at 15:40 HKT:

- Build (T1–T4) landed live: `~/.agents/skills/ui-loop-core` (SKILL.md + `references/` + `scripts/`) and three slimmed loop skills (108 / 85 / 91 lines). Live set = `structural-round/baseline.sha256`.
- Verification: T6 text checks 25/25 pass; T6b scenarios S1–S4, S7 and T6c refreshes S5–S6 pass in fresh sessions (= live set is the verified set).
- `final.sha256` (15:15) hash-differs from the live set for all four SKILL.md files; no file with the final hashes exists on disk (searched worktrees, opencode dirs, orca workspaces, `/tmp`, skills-kimwoct, snapshot repo). Origin unexplained — likely hashed from worker-space copies that never landed.
- T7 (Pi: snapshot → re-pin board 80954030 → anchors → results) **stopped at step 1** per its own rule, pending the coordinator's answer: confirm the live baseline set as canonical (then regenerate `final.sha256` from it), or point at the real final set. Board meanwhile at v37, pin `5945b19a`, 21/21 anchors resolve.
- Decision-4 proposal **approved by the user and applied (T4d)**: `ui-loop-core/scripts/check-evidence.mjs` rejects placeholder/empty values in `pr.url`, `pr.head`, `dispatch.*`, `reference.value`, `issues[].expected/artifact`, names each failing field, warns when `round` ≠ file name. Coordinator rerun: 10/10 fixture cases. Snapshot carries the updated script at `457e4f2e` (`final.sha256` entry `a4b8b3957c3c…`).
- Stuck T6 opencode worker (usage-limit hold, report already written) was closed by Pi at 15:37 (SIGTERM, PID 82983) — the coordinator's stop condition (process exit) is met.
- Parked, unchanged: PR for `documentation/survey-email-signature-contact-tutor.md`.
