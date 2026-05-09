# Branch Protection Policy

The `main` branch must represent the latest stable release-ready state of Dragg.

## Required policy for `main`

Configure branch protection in GitHub:

1. Go to `Settings` → `Branches`.
2. Add a branch protection rule for `main`.
3. Enable:
   - Require a pull request before merging.
   - Require approvals.
   - Require review from Code Owners, if CODEOWNERS is enabled.
   - Dismiss stale pull request approvals when new commits are pushed.
   - Require status checks to pass before merging.
   - Require branches to be up to date before merging.
   - Require conversation resolution before merging.
   - Require linear history, if the repository uses squash/rebase merges.
   - Do not allow force pushes.
   - Do not allow deletions.
4. Add required status check:
   - `Quality checks`

## Required policy for `develop`

`develop` should also require pull requests and passing CI, but can be less strict than `main` while the project is early.

Recommended checks:

- Pull request required.
- CI required.
- No force pushes.

## Merge strategy

Recommended strategy:

- Squash merge feature branches.
- Use clear PR titles following Conventional Commits.
- Release branches should be merged into `main` with a release commit or squash merge.

## Direct pushes

Direct pushes to `main` must be disabled.

All changes must enter `main` through pull requests.
