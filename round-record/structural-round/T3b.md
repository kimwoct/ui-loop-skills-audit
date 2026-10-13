# T3b — align whiteboard.md labels with core (Writer: codex)

Read `COMMON.md` first.

- **Target:** `~/.agents/skills/ui-loop-core/references/whiteboard.md`.
- **Change:** In the "Phase 2 unchanged" bullet, replace the label sentence
  "The closing label for a verification board is `VERIFIED — deployed & e2e-verified <env> <date>` (`FIXED` stays reserved for fix rounds)."
  with:
  "Close the board with the core label `VERIFIED — <env> <build-sha> <date>`. Use only the labels in `ui-loop-core` §State machine and labels."
- **Constraints:** Change only that sentence. Do not rewrite the rest of the file. Its baseline hash is in `baseline.sha256`.
- **Ownership:** this one file.
- **Acceptance:** `grep -c "e2e-verified" whiteboard.md` = 0, `grep -c "FIXED" whiteboard.md` = 0, and the rest of the file is unchanged (`diff` shows one changed line).
