# Merge rehearsal branches (`test-pr1` … `test-pr6`)

These branches exist only to **practice multi-PR merges**, conflict resolution, and tooling demos (for example PromptShield + GitHub PR workflows). Each branch starts from the same `main` snapshot but edits **overlapping files on purpose**.

| Branch | Unique artifact | Shared / conflicting targets |
|--------|-----------------|--------------------------------|
| `test-pr1` | `demo/pr1-touch.txt` | `demo/merge-playground.txt`, `README.md` (hero blurb), `MERGE_DEMO.md` |
| `test-pr2` | `demo/pr2-touch.txt` | Same shared trio + `frontend/src/App.jsx` tagline (collides with `test-pr3`) |
| `test-pr3` | `demo/pr3-touch.txt` | Shared trio + `App.jsx` + `backend/taskboard/main.py` `/run-agent` copy (collides with `test-pr4`) |
| `test-pr4` | `demo/pr4-touch.txt` | Shared trio + `/run-agent` copy (collides with `test-pr3`; skips `App.jsx`) |
| `test-pr5` | `demo/pr5-touch.txt` | Shared trio + `frontend/package.json` `version` (collides with `test-pr6`) |
| `test-pr6` | `demo/pr6-touch.txt` | Shared trio + `package.json` `version` vs `test-pr5` |

Suggested merge drills:

1. Merge `test-pr1` first (establishes the shared files on `main`).
2. Merge `test-pr2` → expect conflicts on the shared files; resolve, then try `test-pr3` for **App.jsx + main.py** collisions.
3. Merge `test-pr5` and `test-pr6` back-to-back without rebasing to surface the **single-line `version` conflict**.

`test-pr` (PromptShield insecure lane) stays independent—open that PR separately from these rehearsal branches.
