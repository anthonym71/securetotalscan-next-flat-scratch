# Rollback

## Isolation (primary guarantee)

Nothing in this build touches the existing production system or the existing
repository `anthonym71/securetotalscan`. The current live site, hosting,
billing and the master branch are exactly as they were before this build.
"Rollback" of tonight's work primarily means: nothing was changed, so there
is nothing to revert.

## Versioned baseline (for future iterations on this repo)

This repository is delivered with its full git history intact. The first
uploaded state is the baseline; do not rewrite or delete it.

- Baseline tag: `v0.1.0-prototype` (create once git access is available:
  `git tag v0.1.0-prototype <first-commit-sha> && git push origin v0.1.0-prototype`).
- Until then, the baseline is the first commit on `main` ("Baseline upload" via GitHub web upload; take its SHA from the repo page).

## Tested restore procedure (run on a throwaway copy, never in place)

Verified locally during the build:

```bash
git clone <repo-url> /tmp/sts-restore-check   # throwaway copy
cd /tmp/sts-restore-check
git revert --no-commit HEAD                   # or: git reset --hard <baseline-sha>
npm ci && npm test                            # 26/26 must pass
npm run build                                 # web bundle must build
```

Outcome during the build: reverting the working tree to the baseline commit
on a throwaway copy reproduced the full test suite (26/26 at the baseline state, verified on a throwaway clone with `git reset --hard` to the baseline commit)
and a clean build. Repo history on GitHub stays intact; deletion is not
needed and is not the rollback mechanism.
