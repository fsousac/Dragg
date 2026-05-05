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

## Scope

This includes:
- Authentication
- Data isolation
- Supabase policies
- Server Actions and route handlers
- User-owned finance data

## Current controls

- Authenticated pages verify Supabase Auth claims before rendering.
- Finance mutations scope database writes by the authenticated `user_id`.
- Transaction writes validate category and payment method ownership before saving IDs.
- Default payment methods for Pix and Payment/Cash are protected from edit and delete operations.
- Security headers and CSP are configured in `next.config.mjs`.

## Dependency checks

Run:

```bash
npm audit --audit-level=moderate
npm run lint
npm run build
```

Fix moderate or higher dependency advisories before release unless a documented exception is accepted by a maintainer.
