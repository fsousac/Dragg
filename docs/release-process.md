# Release Process

Dragg uses semantic versioning and GitHub Releases.

## Versioning

Use semantic versioning:

```txt
MAJOR.MINOR.PATCH
```

Examples:

```txt
v0.1.0-alpha.1
v0.1.0-beta.1
v0.1.0
v1.0.0
```

## Pre-release policy

Use pre-release tags while Dragg is not production-ready.

Recommended first release:

```txt
v0.1.0-alpha.1
```

Mark it as a pre-release in GitHub.

## Branch flow

```txt
feature/* -> develop -> release/* -> main
hotfix/*  -> main -> develop
```

For the first release, a release branch can be created from `develop` or directly from the current stabilization branch if `develop` does not exist yet.

## Release checklist

Before publishing a release:

- [ ] All intended changes are merged through pull requests.
- [ ] CI passes on the release PR.
- [ ] `corepack pnpm run lint` passes.
- [ ] `corepack pnpm run test:coverage` passes.
- [ ] `corepack pnpm run build` passes.
- [ ] Supabase migrations are documented.
- [ ] `.env.example` is up to date.
- [ ] README setup instructions are up to date.
- [ ] SECURITY.md is up to date.
- [ ] CHANGELOG.md is updated.
- [ ] Release notes are drafted.

## GitHub release fields

### Tag

Use:

```txt
v0.1.0-alpha.1
```

### Release title

Use:

```txt
Dragg v0.1.0-alpha.1
```

### Pre-release

Enable `Set as a pre-release` for alpha and beta versions.

Do not mark alpha releases as production-ready.

## Suggested release notes for v0.1.0-alpha.1

```md
## Dragg v0.1.0-alpha.1

This is the first public alpha release of Dragg, an open-source personal finance dashboard.

### Highlights

- Google OAuth authentication with Supabase Auth
- Personal finance dashboard
- Transaction management
- Category-based budgeting
- Payment method management
- Credit card closing and due-day support
- Goals tab
- Forecast/scheduled expense support
- Budget split and category charts
- i18n support
- Regional currency preference
- Supabase database schema and security hardening
- Initial automated test coverage

### Quality and security

- CI pipeline for lint, tests with coverage, and production build
- Supabase Row Level Security policies
- Security hardening documentation
- Open-source contribution templates

### Notes

This is a pre-release and may include breaking changes before a stable release.
```

## After release

- Create the next milestone.
- Open issues for known limitations.
- Merge hotfixes into both `main` and `develop`.
