# T3c — fix one dangling pointer (Writer: codex)

Read `COMMON.md` first.

- **Target:** `~/.agents/skills/ui-loop-core/references/executor-triage.md`, line 18.
- **Change:** Replace "the global selection contract above" with "`ui-loop-core` §Dispatch". Change nothing else.
- **Ownership:** this one file. Baseline hash is in `baseline.sha256`.
- **Acceptance:** `grep -c "contract above" executor-triage.md` = 0; `diff` against the baseline shows one changed line; `node ~/.agents/skills/ui-loop-core/scripts/check-skill-text.mjs` on the file reports 0 missing link targets.
