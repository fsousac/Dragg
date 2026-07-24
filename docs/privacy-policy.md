# Privacy Policy

> **Status: Draft.** This document was drafted from the current implementation of the Dragg codebase to satisfy the sign-up consent requirement. It has not been reviewed by a lawyer and should not be treated as final or legally binding until a maintainer (or qualified legal counsel) reviews and approves it. See [Terms version history](#policy-version-history).

**Version 0.1.0-draft — Last updated: 2026-07-18**

This Privacy Policy explains what data Dragg collects, how it is stored, and what rights you have over it. It should be read together with the [Terms of Use](./terms-of-use.md).

## 1. Purpose of the platform

See the [Terms of Use, "Purpose of the platform"](./terms-of-use.md#1-purpose-of-the-platform) for how Dragg works. This policy focuses specifically on data handling.

## 2. Data we collect

When you create an account and use Dragg, we store:

- **Account/profile data**: name, email address, and (for Google sign-in) profile photo, as provided by Supabase Auth or your Google account.
- **Authentication data**: managed entirely by Supabase Auth (hashed credentials, OAuth tokens). The app itself never sees or stores your password.
- **Financial data you enter**: transactions (amount, date, description, notes, category, payment method), categories, payment methods, monthly budgets, financial goals, subscriptions, and credit card details you choose to record.
- **Basic product analytics**: in production, [Vercel Analytics](https://vercel.com/docs/analytics) and [Vercel Speed Insights](https://vercel.com/docs/speed-insights) collect aggregated, privacy-respecting page-view and performance metrics. These are disabled in local development.

## 3. Data we do NOT collect

- We do not collect or store your bank credentials, card numbers, or any data needed to actually move money — Dragg does not connect to banks or card networks.
- We do not sell your data to third parties or use it for targeted advertising.
- We do not track you across other websites or apps.
- We do not require government ID or other identity documents to use the app.

## 4. How your data is stored

- All application data is stored in a [Supabase](https://supabase.com/) Postgres database.
- User-owned tables (profiles, categories, payment methods, transactions, monthly budgets, goals, and related metadata) enforce Postgres **Row Level Security (RLS)**, so the database itself only returns rows belonging to the authenticated user. See `docs/security.md` and `docs/database.md` for implementation details.
- Server-side code additionally scopes every read and write by the authenticated user's ID and validates that referenced categories, payment methods, and other records belong to that same user before saving.
- Free-text fields such as transaction descriptions and notes are treated as sensitive personal data; avoid entering unnecessary sensitive details (such as document numbers) into them.

## 5. Security practices

- Authentication is handled by Supabase Auth; the app never has access to your raw password.
- The client only ever uses Supabase's public/publishable key; privileged (service-role) credentials are never exposed to the browser.
- A strict Content Security Policy and standard security headers are enforced (see `next.config.mjs` and `docs/security.md`).
- Automated security scanning (dependency audits, static analysis, container/filesystem scanning, and baseline dynamic scanning) runs in CI on every change. See `SECURITY.md` for the full list and for how to report a vulnerability.

## 6. Technologies used

- **Next.js** (application framework) and **Vercel** (hosting, for the maintainers' deployment).
- **Supabase** (Postgres database, authentication, row-level security).
- **Vercel Analytics** and **Vercel Speed Insights** (aggregate usage/performance metrics, production only).
- **Google OAuth** (optional sign-in method).

## 7. Third-party integrations and data sharing

- **Supabase**: processes and stores your account and financial data as our database and auth provider.
- **Google**: if you choose "Continue with Google," Google authenticates you and shares your name, email, and profile photo with Dragg via OAuth, per Google's own privacy terms.
- **Vercel**: hosts the application and, in production, collects aggregated analytics/performance data through Vercel Analytics and Speed Insights.
- We do not share your financial data with any other third party, and we do not sell it.

## 8. User responsibilities

- Keep your account credentials secure and do not share your account with others.
- Avoid entering sensitive data (such as ID/document numbers or bank credentials) into free-text fields like transaction notes.
- Report suspected security or privacy issues per `SECURITY.md`.

## 9. Platform limitations and disclaimer

Dragg is a personal record-keeping tool, not a financial institution. See the [Terms of Use, "Limitations and disclaimer"](./terms-of-use.md#7-limitations-and-disclaimer) for the full disclaimer, including that Dragg does not provide financial, tax, or legal advice.

## 10. Your rights

Depending on where you live, you may have rights to access, correct, export, or delete your personal data (for example, under Brazil's LGPD or comparable data protection laws).

The database schema includes a `privacy_requests` table designed to support access, export, correction, deletion, consent, and support workflows. **As of this draft, there is no self-service UI for these requests yet** — until that ships, please use the contact method below and a maintainer will help you manually. You can also delete individual transactions, categories, budgets, and goals yourself at any time from within the app.

## 11. Contact and requests

- General questions: open a [GitHub issue](https://github.com/fsousac/Dragg/issues).
- Data access, correction, export, or deletion requests, and security or privacy-sensitive matters: open a private [GitHub Security Advisory](https://github.com/fsousac/Dragg/security/advisories) or contact a maintainer directly, per `SECURITY.md`. Please do not include sensitive account details in a public issue.

## Policy version history

| Version | Date | Change |
|---|---|---|
| 0.1.0-draft | 2026-07-18 | Initial draft, pending maintainer review, created alongside the sign-up consent checkbox. |
