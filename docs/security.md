# Security Notes

This document describes the current application-level security expectations. It complements `SECURITY.md`, which covers vulnerability reporting.

## Authentication

- Supabase Auth is the identity provider.
- Server-rendered app pages verify claims before rendering authenticated UI.
- OAuth profile data is displayed as read-only account information.
- `user_metadata` can be displayed, but must not be used for authorization decisions.

## Data access

- User-owned tables must have Supabase Row Level Security enabled.
- Server-side queries also scope reads and writes by authenticated `user_id`.
- Server Actions validate runtime input because client-side TypeScript types are not trusted.
- Mutations that receive category, payment method, or transaction IDs must verify ownership before writing.

## Protected payment methods

Pix and Payment/Cash are default payment methods and cannot be edited or deleted through the app.

## Headers and CSP

Security headers are configured in `next.config.mjs`.

- `frame-ancestors 'none'` and `X-Frame-Options: DENY` prevent framing.
- `object-src 'none'` blocks legacy plugin content.
- `base-uri 'self'` blocks malicious base URL injection.
- `unsafe-eval` is only included in development for the Next.js dev server.

## Dependency checks

Run before release:

```bash
npm audit --audit-level=moderate
npm run lint
npm run build
```
