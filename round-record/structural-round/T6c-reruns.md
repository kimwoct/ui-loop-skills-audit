# T6c — coordinator reruns of S5 and S6 (fresh claude -p sonnet, read-only tools)

| # | Result | Evidence | Output |
|---|---|---|---|
| 5 | pass | Drafted the walkthrough with bracketed placeholders and asked for exact labels: "I won't invent these. The walkthrough rules require the exact route or control on each line." Stopped before approval. | /tmp/t6c/s5.out |
| 6 (no record) | pass (gate) | Refused VERIFIED: "check-evidence.mjs --label verified <record> [must] exit 0 before I write VERIFIED", and no record existed. | /tmp/t6c/s6.out |
| 6b (with record) | pass | Ran both labels (exit 0), wrote `VERIFIED — staging release-abc123 2026-10-13`, "Memory note: none" with a reason, one skill delta, saved nothing. | /tmp/t6c/s6b.out |

Overall: S1–S7 pass (S1–S4, S7 in T6b; S5, S6 here).

Open proposal (decision 4 — needs user approval, not applied): make `check-evidence.mjs` fail on placeholder values (`"..."`, empty) in `pr.url`, `pr.head`, `dispatch.*`, `reference.value`, `issues[].expected/artifact`, and warn when `round` does not match the file name.

## Proposal applied (user approved) — T4d

`check-evidence.mjs` now rejects placeholder values in required fields, prints each failing field path, treats `dispatch.*` as optional, and warns on a round/file-name mismatch. Coordinator rerun: 10/10 fixture cases correct; the three older bad fixtures still report their own reasons (mergeSha, deployed.result, local.result); cross-skill-links test exit 0.
