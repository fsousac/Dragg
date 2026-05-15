# Contributing to Dragg

Thank you for your interest in contributing to Dragg.

Dragg is an open-source personal finance application. The project uses pull requests, protected branches, automated checks, and semantic versioning.

## Language

All code, comments, pull requests, issues, documentation, labels, and UI text must be written in English.

Portuguese translations may exist only as product translations or localized documentation.

## Git flow

The repository follows a lightweight Git Flow model:

- `main`: stable branch. Only release-ready code should be merged here.
- `develop`: integration branch for the next release.
- `feature/*`: new features.
- `fix/*`: bug fixes.
- `chore/*`: maintenance, tooling, documentation, CI.
- `release/*`: release stabilization branches.
- `hotfix/*`: urgent fixes created from `main`.

Expected flow:

```txt
feature/* -> develop -> release/* -> main
hotfix/*  -> main -> develop
```

Direct pushes to `main` should not be allowed. All changes must enter `main` through pull requests.

## Branch naming

Use short, descriptive branch names:

```txt
feature/add-recurring-transactions
fix/dashboard-budget-overflow
chore/add-ci-pipeline
release/v0.1.0-alpha
hotfix/auth-callback-redirect
```

## Commit convention

Use Conventional Commits:

```txt
feat: add category budget limits
fix: correct credit card closing date calculation
docs: update Supabase setup guide
test: add transaction aggregation tests
ci: add pull request checks
chore: update dependencies
refactor: simplify dashboard calculations
```

Accepted commit types:

- `feat`
- `fix`
- `docs`
- `test`
- `ci`
- `chore`
- `refactor`
- `style`
- `perf`
- `build`
- `revert`

## Code standards

- Use TypeScript.
- Keep components reusable.
- Follow the existing project structure.
- Keep business logic outside UI components when possible.
- Prefer existing shadcn/ui primitives.
- Use existing translation keys instead of ad hoc UI text.
- Keep data fetching and mutations in server-side modules or Server Actions when credentials or ownership checks matter.
- Validate Server Action input at runtime before writing to Supabase.
- Verify user ownership for any mutation that receives database IDs from the client.
- Do not introduce service-role operations into client-rendered code.
- Keep Supabase SSR clients in `lib/supabase/*` unless a new boundary is needed.
- Keep finance reads and business logic in `lib/finance/*` instead of UI components.
- Keep desktop dialogs, except the new transaction dialog, at the project standard of 50vw by 50vh.

## Supabase changes

- Add SQL migrations under `supabase/migrations`.
- Keep RLS policies aligned with authenticated user ownership.
- Keep privileged helper functions in a private or otherwise unexposed schema.
- Do not use `user_metadata` for authorization decisions.
- Do not expose Supabase service-role credentials to the browser.
- When transactions reference categories or payment methods, preserve same-user ownership guarantees.
- Preserve LGPD/privacy workflow support when changing user-owned tables.

## Pull requests

Before opening a pull request:

```bash
corepack pnpm run lint
corepack pnpm run test:coverage
corepack pnpm run build
```

A pull request should include:

- Clear description of the change.
- Linked issue when applicable.
- Screenshots or videos for UI changes.
- Migration notes for database changes.
- Test notes.

Keep PRs small and focused.

## Issues

Use clear issue titles and include enough context for maintainers to reproduce or evaluate the request.

For bugs, include:

- What happened.
- What was expected.
- Steps to reproduce.
- Browser/device information.
- Screenshots if relevant.

For features, include:

- The user problem.
- Proposed behavior.
- Alternatives considered.

## Releases

Dragg uses semantic versioning.

Initial public releases should use pre-release tags until the app is production-ready, for example:

```txt
v0.1.0-alpha.1
v0.1.0-beta.1
v1.0.0
```

Use `CHANGELOG.md` as the release checklist source until a dedicated release-process document exists.
