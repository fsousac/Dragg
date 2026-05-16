# Security Notes

This document describes the current application-level security expectations. It complements `SECURITY.md`, which covers vulnerability reporting.

## Authentication

- Supabase Auth is the identity provider.
- Public users authenticate with Google OAuth through Supabase.
- The OAuth callback exchanges the code server-side and rejects unsafe redirect targets.
- `proxy.ts` refreshes Supabase session cookies through `@supabase/ssr`.
- Server-rendered app pages verify claims and user data before rendering authenticated UI.
- OAuth profile data is displayed as read-only account information.
- `user_metadata` can be displayed, but must not be used for authorization decisions.

## Data access

- User-owned tables must have Supabase Row Level Security enabled.
- Current migrations force RLS on user-owned finance and privacy tables.
- Unauthenticated `anon` table access is revoked for user-owned finance data.
- Server-side queries also scope reads and writes by authenticated `user_id`.
- Server Actions validate runtime input because client-side TypeScript types are not trusted.
- Mutations that receive category, payment method, transaction, subscription, or goal IDs must verify ownership before writing.
- Database triggers also reject transactions that reference another user's category or payment method.

## Runtime validation

- Transaction, category, payment method, subscription, and goal Server Actions validate payloads with Zod.
- ID inputs are validated as UUIDs.
- Text inputs are trimmed and length-limited before writes.
- Date inputs are validated and normalized before persistence.
- Amounts are checked for finite positive or non-negative values according to the mutation.

## Protected payment methods

Pix and Cash payment methods cannot be edited or deleted through the app.

## LGPD and privacy

- The `privacy_requests` table supports access, export, correction, deletion, consent, and support workflows.
- User-owned tables include `deleted_at` columns for soft-deletion workflows.
- Free-text transaction fields are documented as sensitive fields in database comments.
- Avoid storing credentials, account numbers, document IDs, or other unnecessary sensitive data in transaction descriptions or notes.

## Headers and CSP

Security headers are configured in `next.config.mjs`.

- `frame-ancestors 'none'` and `X-Frame-Options: DENY` prevent framing.
- `object-src 'none'` blocks legacy plugin content.
- `base-uri 'self'` blocks malicious base URL injection.
- `form-action` is restricted to the app and Supabase.
- `connect-src` is restricted to the app, Supabase, and Vercel telemetry endpoints.
- `img-src` allows app assets, Supabase, and Google OAuth avatar URLs.
- `unsafe-eval` is only included in development for the Next.js dev server.

## Dependency checks

Run before release:

```bash
pnpm audit --audit-level=moderate
pnpm run security:audit
pnpm run security:trivy
pnpm run lint
pnpm run test:coverage
pnpm run build
```

## Automated Trivy scans

The repository includes `.github/workflows/trivy.yml` for automated Trivy filesystem scans on pull requests, pushes to `main` and `develop`, a weekly schedule, and manual dispatch.

The scan checks:

- dependency vulnerabilities
- leaked secrets
- infrastructure and repository misconfigurations

The workflow uploads SARIF results to GitHub Code Scanning and fails on unfixed high or critical findings. For local runs, install the Trivy CLI and run:

```bash
pnpm run security:trivy
```

## Additional automated security scans

The repository also includes the selected recommended checks:

- `.github/workflows/dependency-audit.yml`: runs `pnpm audit --audit-level=moderate`.
- `.github/workflows/semgrep.yml`: runs Semgrep Community Edition rules for OWASP, JavaScript, TypeScript, and React, then uploads SARIF to GitHub Code Scanning.
- `.github/workflows/zap-baseline.yml`: builds and starts the app locally, then runs an unauthenticated OWASP ZAP baseline scan against the login surface.
- `.github/workflows/zap-full-scan.yml`: builds and starts the app locally, then runs an unauthenticated OWASP ZAP full active scan on a weekly schedule or manual dispatch.

ZAP is intentionally scoped to the unauthenticated local app surface until an authenticated test account is available. The baseline scan runs on pull requests; the full scan is schedule/manual only because active DAST can be slower and more intrusive.
