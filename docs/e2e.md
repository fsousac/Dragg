# End-to-End Tests

Dragg uses [Playwright](https://playwright.dev/) for end-to-end (E2E) tests covering the critical user workflows: authentication, transactions, budgets, payments and subscriptions, credit cards and invoices, financial goals, dashboard navigation, theming, and internationalization.

Specs live in `e2e/`. There are no `data-testid` attributes in the app — tests rely on accessible roles, labels, and visible text, matching how a real user (or a screen reader) would interact with the app.

## Running locally

E2E tests run against a real, disposable [local Supabase stack](https://supabase.com/docs/guides/local-development) (Postgres + Auth + REST), not a mocked backend — this matches how the app actually talks to Supabase both from the client and from Server Actions, which a browser-level network mock cannot intercept.

Prerequisites:

- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`supabase`)
- [Docker](https://docs.docker.com/get-docker/) running locally

Steps:

```bash
# 1. Start the local Supabase stack (applies supabase/migrations automatically)
supabase start

# 2. Copy the printed API URL and Publishable key into your shell
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from `supabase status`>

# 3. Install Playwright browsers (first run only)
pnpm exec playwright install --with-deps chromium

# 4. Run the suite (builds and starts the app automatically)
pnpm run e2e

# Or, interactively:
pnpm run e2e:ui
```

When you're done, tear the local stack down with `supabase stop`.

## How authentication works in the suite

A Playwright "setup" project (`e2e/setup/auth.setup.ts`) signs up a fresh, uniquely-named user through the real sign-up form and saves the authenticated session to `e2e/.auth/user.json`. Every other authenticated spec reuses that session instead of signing in again, per [Playwright's recommended auth pattern](https://playwright.dev/docs/auth). Specs that must run unauthenticated (`landing.spec.ts`, `auth.spec.ts`) run in a separate project with no stored session.

Local Supabase disables email confirmation by default (`supabase/config.toml`), so sign-up returns an active session immediately — no inbox to check.

Each test that creates data (transactions, categories, goals, etc.) uses a unique, timestamped name, so specs stay independent of each other and of run order, even though they share one signed-up user within a single suite run. Because CI starts from a fresh, empty local database every run, there's no cross-run state to clean up.

## CI

`.github/workflows/e2e.yml` runs the suite on every pull request targeting `main` or `develop`, and on pushes to those branches. It starts a local Supabase stack with the Supabase CLI, builds and starts the app against it, and runs the full Playwright suite. A failed run uploads the HTML report as a build artifact.

The workflow reports as a normal PR check; enabling GitHub's "require status checks to pass" branch protection for `develop`/`main` (Settings → Branches) is a repo-owner action outside the scope of what this workflow itself can configure.
