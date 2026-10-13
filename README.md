# Skills snapshot — element-access gate board (revision 3)

Pinned source for the Whiteboard session "Element-access gate". The board's
`review-source:head/...` links resolve into this snapshot.

- `.agents/skills/ui-fix-loop/SKILL.md` — copied from `/Users/user/.agents/skills/ui-fix-loop/SKILL.md`.
- `.agents/skills/ui-verify-loop/SKILL.md` — copied from `/Users/user/.agents/skills/ui-verify-loop/SKILL.md` (also reachable via the `~/.omp/agent/skills/ui-verify-loop` symlink; one physical file).
- `.agents/skills/ui-logic-loop/SKILL.md` — copied from `/Users/user/.agents/skills/ui-logic-loop/SKILL.md` (symlinked into `~/.omp/agent/skills/` since 2026-10-13).

Revision history:
1. `10e831f` — initial snapshot (two skills, pre-opus-review state).
2. `c2ae32a` — replay qualifiers at verify-loop L37/L46 (codex review pass).
3. this commit — gate-owner refactor applied by the opus session (direct writer):
   ui-fix-loop holds the single **Element access (shared owner)** definition
   (Phase 2) plus the Phase 3 replay clause and the anti-pattern line;
   ui-verify-loop P0 step 3 and ui-logic-loop Phase 1 step 4 became pointers
   (step numbers kept so cross-references resolve); phantom tool names and the
   dead `instance-switch` reference removed; ui-fix-loop added to the snapshot.
   Backups + pre/post hashes: `~/.agents/skill-backups/2026-10-13-element-gate-owner/`.

All copies verified byte-identical to the live files (`cmp`) at commit time
2026-10-13, so line anchors on the board match the edited files.
`~/.agents` itself is not a git checkout, so the board pins this snapshot repo
(commits target, head commit) instead of a worktree.