---
name: ui-fix-loop
description: Loop-engineering workflow for UI-visible bug fixes and UI changes. Use before drilling into or implementing any frontend/UI fix that changes what the user sees. Maintains a single review HTML canvas that (1) lists and highlights the parts to be fixed, (2) previews the intended end result for user approval before real code is touched, and (3) is updated with live-page evidence after implementation, looping fix → verify until the canvas matches the live result.
---

# UI Fix Loop

A standing workflow for UI bug fixes, usable in any project. One HTML canvas accompanies the fix through its whole lifecycle: **REVIEW → PREVIEW → IMPLEMENT → VERIFY**, looping until the canvas and the live page agree.

**Tradeoff:** for trivial one-line changes with no layout or logic impact, keep this lightweight and use judgment — the loop is mandatory for anything where pixels or interaction change.

## Coding-agent selection and Herdr sessions (global)

This contract applies to every repository using this skill, `ui-logic-loop`, or `ui-verify-loop`; it is not limited to a named project.

- **Selection before dispatch.** Every canvas approval panel must offer the installed coding agents, with **Pi selected by default for a new decision**. Preserve a saved explicit selection. For a diagram-only or Whiteboard-hosted round, record the same choice with its approval answers instead of requiring an HTML panel.
- **Honor the choice.** Persist the selected agent in the decision record and pass it to the implementation dispatcher. An explicit user choice takes precedence over executor triage. If Pi or the chosen agent is unavailable, or the repository is not configured, report the blocker and ask for an explicit alternative; never silently substitute an agent.
- **One run, one Herdr session.** Every dispatched coding-agent run must execute in its own uniquely named persistent Herdr terminal session, in the target repository's working directory. Separate panes in one shared session do not satisfy isolation. A retry that creates a new run gets a new session; monitoring or resuming the same run reuses its session. Preserve active-run deduplication so repeated approval does not launch duplicate agents.
- **Approval still gates execution.** Selection alone does not launch an agent. Start implementation only after all required numbered answers and the reference/preview approval are present. Do not start coding agents during preview checks.
- **Status and evidence.** Show dispatch state, selected/assigned agent, run ID, and Herdr session ID alongside the saved timestamp and decision-event status. Record the run/session mapping on the canvas or diagram evidence so the terminal can be inspected. A queued decision or emitted event is not proof that an agent started; confirm the actual session and process before claiming it is running.
- **Verify the shared path.** When changing this behavior, test Pi default, saved selection, selected-agent payload, unavailable-agent/configuration errors, approval gating, duplicate approvals, and distinct Herdr sessions for distinct runs. Recheck the same path on the confirmed deployment target before calling the runtime fixed.
- **Instructions are not runtime deployment.** If the shared widget/dispatcher lacks these capabilities, report that gap; editing these skills does not implement it. Keep runtime changes and deployment within the user's separately authorized scope.

## Worktree and PR (global default)

Every approved implementation runs in a **new git worktree** on a new branch cut from the up-to-date **parent branch** (`develop` unless the user names another), and the round ends by **opening a PR into that parent branch**. This is the recommendation; do not ask the user to confirm it.

- Never implement in the main checkout or in a checkout the dispatcher happens to point at. If the current branch lacks the code to change, recut the worktree from the parent branch rather than merging another branch into it.
- Before creating the worktree, use `gh repo view --json nameWithOwner,defaultBranchRef` and relevant `gh pr view <number> --json baseRefName,headRefName,mergedAt` evidence to check the intended parent. Verify that parent exists with `gh api repos/<owner>/<repo>/branches/<parent> --jq .name`. An explicit user-approved parent takes precedence; the GitHub default branch alone does not establish the feature's parent. Record the evidence on the canvas.
- Approval questions cover **implementation only**: the intended end result, the reference, and genuine scope choices. Do **not** ask about the deployment target, environment, or release timing. Deployment is a separate, later step that starts only after the PR is merged and the user asks for it.
- If the parent remains ambiguous, cannot be verified, or `develop` does not exist and no parent was explicitly approved, add the last numbered required textbox question: "Which parent branch should this worktree start from and the PR target?" State the evidence-backed recommendation, and wait for its answer. Otherwise do not ask again or silently substitute the GitHub default branch.
- Fetch the confirmed parent and cut the new worktree from it. Create the PR with explicit `gh pr create --base <parent> --head <worktree-branch>`, then check `gh pr view <url> --json baseRefName,headRefName,url`. Both refs must match the recorded parent and worktree branch before marking the round IMPLEMENTED; correct a mismatched PR base with `gh pr edit <url> --base <parent>` and recheck.
- Record the worktree path, branch, parent branch, and PR URL on the canvas evidence.

## The canvas

- Path: `~/.agents/ui-fix-canvas/<repo>/<issue-slug>.html` — outside every repo, so scratch files are never committed and no per-project setup is needed. The `<repo>` segment must be a lowercase-hyphen slug (`ai-leave-management-frontend`, never the GitHub-cased name) and, when the canvas should dispatch work, a key in the dispatch-watcher's `REPOS` map; root-level pages (`/<slug>.html`) are rejected too. A non-conforming segment makes every Approve POST 404 "unknown canvas" with no other symptom.
- ONE file per issue, updated in place through the phases. Never fork it into per-phase copies.
- Plain hand-written HTML/CSS replicating the relevant UI region — no framework, no build step.
- Every canvas includes the approval widget: add `<script src="/canvas-approval.js"></script>` before `</body>`. It renders a floating decision panel — per-question status, a **steering input** for the implementation logic, and Approve / Request-changes buttons that POST to the server's decision API. Open decisions come in two authoring forms (Phase 2): askUser-style **selection groups answered on the canvas itself** (`div.approval-answer-select[data-question]` with `button.approval-option` pills, the recommended one marked `data-recommended="true"`), and legacy free-text `approval-answer` fields the panel collects. The gate keys off both forms; the server-side question set/hash (`herdr_dispatch`) counts both too — a canvas with the script but no questions has a widget with nothing to gate.
- **Decision hooks.** Once a decision is saved, the widget dispatches a `ui-fix-loop:decision` CustomEvent on `document` (detail: `{canvas, status, comment, steering, answers, record}`) and calls `window.uiFixLoopApprovalCallback(record)` if defined — a canvas page can listen for either to chain behavior after `approved` (the callback must be set before the widget script loads). A non-2xx POST renders "save failed — is server.py running?" instead of a false success, and an exception thrown by the callback is logged after the fact without un-saving the decision.
- **The heading carries the board task no.** When the work has a Conductor card — a canvas dispatch, or any request that can be tied to a card — begin both `<h1>` and `<title>` with `[t-<id8>]` (e.g. `<h1>[t-3ecb9f12] 前後測活動報告 …</h1>`), taken from the card's `display_id`. The raw `:8791` URL has no board chrome, so the heading is the only place the id can appear. When no card id is knowable, leave the heading clean rather than guessing — a wrong prefix is worse than none.
- **Traceability is two-way and is part of the deliverable:**
  - canvas → card: the `[t-<id8>]` heading above. A canvas opened from its bare tailnet URL is anonymous without it.
  - card → canvas: the card's `canvas` field must be `<repo>/<slug>` — that field is what the board card modal, the Inbox rows, and the `/requirement-canvas/<cardId>` board route render as the review link. Canvas dispatches write it at intake; for any other origin (interactive rounds, card created before/without the canvas), set it at canvas-creation time, not when the user goes looking for it. Setting it needs conductor tooling — `conductor.kanban_update` from a session that has it, or the dashboard card edit — so a session without conductor access must ask the conductor session to write the link rather than skip it.
  - Verify both directions before presenting: `GET /requirement-canvas/<cardId>` → 200 with `<title>t-<id8> · requirement canvas</title>`, and the served canvas `<title>` begins with `[t-<id8>]`. Query the tailnet board URL (the tailnet identity authenticates); on `localhost:8798` a session cookie is required or the GET redirects to `/login`. If either direction fails, the round is not reviewable end-to-end and must not be presented as ready.

## Serving the canvas (server.py + Tailscale)

- The canvas server normally runs under launchd (`com.kxxwxxg.canvas.server`, port 8791, localhost) — start `python3 ~/.agents/ui-fix-canvas/server.py` by hand only if it is down (a manual start while launchd holds the port just fails to bind). It extends a static server with a decision API: `POST /api/decision {canvas, status, comment}` writes `<repo>/<slug>.decision.json`; `GET /api/decision?canvas=...` reads it back (`status` is `pending` | `approved` | `changes-requested`). Do NOT use bare `python3 -m http.server` — it has no decision API.
- Before handing the URL to the user, prove the canvas is wired: `GET /api/decision?canvas=<repo>/<slug>` → `{"status":"pending"}`. That one request catches an unwired Approve button, a non-conforming repo segment, and a mistyped id — a 404 "unknown canvas" here means the widget would silently do nothing for the user too.
- Browsers in agent sessions can only open http(s) pages: open `http://localhost:8791/<repo>/<issue-slug>.html`. Screenshot it for the user when presenting.
- Expose the same server to the user's tailnet so they can review on any of their devices: `tailscale serve --bg 8791` → `https://<machine>.<tailnet>.ts.net/<repo>/<issue-slug>.html` (this machine: `mk1a3zpmacbook-pro.tail490654.ts.net`). If serve reports "not enabled on your tailnet", print the enable link it returns and ask the user to open it once, then run the serve command again.
- The agent learns the decision by reading the `.decision.json` file or GET-ing the API on localhost. A chat reply approving is equally valid — the widget is a convenience, not the only channel.
- Driving the dashboard API by curl (e.g. to check `/requirement-canvas/<cardId>`): `POST /login` wants a JSON body (`-H 'Content-Type: application/json' -d '{"token":"…"}'`, token in `~/.conductor/dashboard-token`) plus an `Origin` header — form-encoded bodies get 415. On the tailnet board URL (`:8443`) no token is needed: the tailnet identity authenticates.

## Phase 1 — REVIEW (before drilling down)

Before reading implementation code in depth, build the canvas in its REVIEW state:

- A mock of the **broken** UI region as it currently renders (replicate the defect faithfully — e.g. the duplicated rail rows).
- A numbered **issue list**: one line per defect, each with a concrete expected behavior.
- Numbered **highlight markers** on the mock, one per issue, so list ↔ region mapping is visible at a glance.

**Done when:** every defect the review found is a numbered issue with a matching marker on the mock, and the canvas opens in a browser.

## Phase 2 — PREVIEW (approval gate)

Update the same file to show the **intended end result** (the same region as it should render after the fix), keeping the issue list with each item marked "pending fix".

**Mandatory question answers — silence never approves.** Every open decision (template vs alternative, keep/drop a category, code numbers … — never deployment target or timing; see **Worktree and PR**) is rendered on the canvas as an **askUser-style numbered question** — title, short description, concrete options as pills inside its own selection group, and the recommended default marked:

```html
<div class="approval-answer-select" data-question="① Topic — which report topic?">
  <div class="askTitle"><span>Topic</span><span>Single</span></div>
  <div class="askDesc">Which topic should the report cover?</div>
  <div class="askOptions">
    <button type="button" class="approval-option" data-option="Smart campus" data-recommended="true">Smart campus</button>
    <button type="button" class="approval-option" data-option="Company annual">Company annual</button>
  </div>
</div>
```

Mark the recommended default with `data-recommended="true"` (the widget appends the "(Recommended)" tag — don't bake the suffix into the text) and leave pills unselected at authoring time: the user picks explicitly, and picks are mirrored back onto the canvas buttons as `data-selected="true"`. Genuinely open questions keep the legacy free-text form:

`<textarea class="approval-answer" data-question="⟨N⟩ <short question>" placeholder="…"></textarea>`

The widget keeps Approve / Request-changes **disabled until every question has an explicit answer** (a pill pick or filled textbox). The panel's **steering input** is where the user steers the implementation logic ("skip the modal step", "keep the existing wording") — stored as `steering` in the decision record next to the selections (`answers` + composed `comment`). A chat reply approves only if it **names a choice for every numbered question** in so many words (picking the recommended pill is the fast path) — a bare "approved" / "looks good", or silence on any point, is NOT consent to a recommended default — re-ask, listing the unanswered numbers, and wait again.

**Element access (shared owner).** This block is the one definition of the element-access gate. `ui-verify-loop` and `ui-logic-loop` point here. Use the gate when the user must do UI actions to reach an affected element. UI actions are clicks, route changes, and role or state prerequisites. Before you ask for approval, put two artifacts on the canvas:

- An **access-path diagram**. Start at the app entry. Go through the routes and the clicks. End at the element. Show each role or state prerequisite as a branch. Use plain HTML/SVG boxes and arrows, or a mermaid-source block. The canvas has no build step.
- A numbered **element-access walkthrough**. Write one action on each line. Name the exact route or control on each line. Example: `1. /dashboard 2. 量表追蹤 3. survey row → 重寄提醒 4. confirm modal`.

The walkthrough is the replay script of the round. Local evidence (Phase 3) and deployed evidence (`ui-verify-loop` Phase 2, `ui-logic-loop` Phase 4) follow it step by step. Do not change the steps between the runs. If the round cannot reach an element on a recorded path, the round is blocked. Put the blocker on the canvas before implementation starts, not after.

Present the canvas to the user and state the intended end result in one or two sentences. **Wait for the user's approval before touching real code** — given either as a chat reply that answers every question, or via the canvas approval widget (check the decision API: only `approved` with all answers present opens the gate; `changes-requested` means fold the comment into the preview and re-present). A wrong preview is the cheapest possible failure — this gate exists because fixes built on wrong assumptions (verified symptom area only, adjacent behavior unbroken-checked) ship regressions.

## Executor triage (optional — typesafe_evaluate)

When Phase 3 is about to start, more than one executor is available, and TypeSafe is enabled for the session (`/typesafe enable` once, or `PI_TYPESAFE_ENABLED=1` + `TYPESAFE_API_KEY` headless), spend **ONE** batched call to pick the dispatch target before implementing:

- **state**: the fix task in one sentence, plus one factual field per candidate agent — harness, model, browser tooling (can it drive the live-page evidence steps?), and its track record in this repo. Name the fields; the questions reference them.
- **questions**: one **score** question per agent — "How able is `candidates.<id>` to complete this task end to end?" on a 4-level rubric phrased as situations, not degrees (0 *unlikely: cannot drive the browser-verified loop unaided* / 1 *partial: lands the code but struggles with live-page evidence* / 2 *capable: completes fix + verification, maybe with a retry* / 3 *strong: end-to-end with evidence, minimal supervision*) — plus one **choice** question for dispatch order. One judgment per question; batch everything into the single request.
- **recommend** the highest score (break ties with the choice answer), and record the scores with their probabilities next to the canvas issue list or as a card event. Dispatch the approved agent under the global selection contract above; triage never silently overrides a user selection or the Pi default.

Guardrails: triage is an optimization, never a gate — if the tool is disabled, unkeyed, or returns a `budget` error, skip triage silently and retain the approved agent (Pi by default). Confidence is distribution concentration, not proof or authorization; report it alongside the choice, never act on it alone. Do not spend a second request re-triaging after a decline — the loop's own verify phase is the correction mechanism.

## Phase 3 — IMPLEMENT, then VERIFY (the loop)

1. Implement the real fix in the project code.
2. Run the project's checks (typecheck, tests, build).
3. Load the **live page** and capture evidence (DOM facts and/or screenshot) for every numbered issue. If the element-access gate applies (Phase 2), reach each element by the walkthrough, step by step.
4. Update the same canvas: mark each issue fixed or still-broken from the live evidence, with an after-rendering beside the original mock.
5. If any issue is not confirmed fixed on the live page, loop back to step 1. Only report completion when the canvas's fixed state and the live page match.

## Anti-patterns this skill exists to prevent

- Reading silence as consent — an unanswered approval question is an open question, not a default selected. No "silence on a point = take the default" phrasing, ever.
- Rendering an open decision as a blank textbox when concrete options exist — askUser-style pill selectors with the marked recommended default are the default authoring; the steering input carries free judgment, not the answer format.
- Verifying only the region the user pointed at while the change alters a shared predicate consumed by other regions.
- Declaring "fixed" from code reading alone, without re-observing the live rendered page.
- Reaching for an element no one walked: when element access needs UI actions, the access-path diagram and the walkthrough (Phase 2 **Element access**) exist before implementation. Without them, no one can reproduce the evidence path on localhost or on the deployed environment.
- Patching the same visual bug repeatedly because each fix is validated against the symptom, not against the full grid of affected states.
