# Security Policy

## Reporting vulnerabilities

If you discover a security vulnerability, do not open a public issue.

Instead, please contact the maintainer directly or open a private security advisory via GitHub.

## Guidelines

- Do not expose credentials
- Never commit secrets
- Always use environment variables
- Never expose Supabase `service_role` credentials to client code
- Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only for browser-safe Supabase access
- Keep Supabase Row Level Security enabled for user-owned finance tables
- Validate all Server Action inputs at runtime; TypeScript types are not a security boundary
- Check resource ownership before mutations that accept IDs from the client
- Keep the production Content Security Policy as strict as possible; development-only relaxations must be conditional
- Keep privileged database helper functions outside exposed schemas
- Treat transaction descriptions and notes as sensitive personal data

## Scope

This includes:
- Authentication
- Data isolation
- Supabase policies
- Server Actions and route handlers
- User-owned finance data
- LGPD/privacy request workflows

## Current controls

- Authenticated pages verify Supabase Auth claims before rendering.
- Finance mutations scope database writes by the authenticated `user_id`.
- Transaction writes validate category and payment method ownership before saving IDs.
- Database triggers reject cross-user category and payment method references on transactions.
- Default payment methods for Pix and Cash are protected from edit and delete operations.
- RLS is forced on current user-owned finance and privacy tables.
- Unauthenticated table access is revoked for user-owned finance data.
- Security headers and CSP are configured in `next.config.mjs`.

## Dependency checks

Run:

```bash
pnpm audit --audit-level=moderate
pnpm run security:trivy
pnpm run lint
pnpm run test:coverage
pnpm run build
```

Fix moderate or higher dependency advisories before release unless a documented exception is accepted by a maintainer.

Automated Trivy scans also run in GitHub Actions for pull requests, pushes to protected integration branches, weekly scheduled checks, and manual dispatch. Results are uploaded as SARIF to GitHub Code Scanning.
