# Terms of Use

> **Status: Draft.** This document was drafted from the current implementation of the Dragg codebase to satisfy the sign-up consent requirement. It has not been reviewed by a lawyer and should not be treated as final or legally binding until a maintainer (or qualified legal counsel) reviews and approves it. See [Terms version history](#terms-version-history).

**Version 0.1.0-draft — Last updated: 2026-07-18**

## 1. Purpose of the platform

Dragg is a free, open-source personal finance dashboard. It helps you track income, expenses, savings, budgets, subscriptions, credit cards, and financial goals, and view reports about your own spending.

Dragg is provided as-is by its maintainers and contributors on a best-effort, volunteer basis. It is not a bank, a financial institution, a broker, or a regulated financial service, and it does not move money on your behalf.

## 2. How Dragg works

- You create an account with Google OAuth or with an email and password, both handled by [Supabase Auth](https://supabase.com/).
- Once signed in, you manually record your own financial data (transactions, categories, payment methods, budgets, goals, subscriptions, credit cards) so the app can show you dashboards and reports.
- Dragg does not connect to your bank, card issuer, or any external financial account on your behalf. Any amounts, balances, or due dates you see are only as accurate as the data you (or, for Google sign-in, your Google profile name/photo) provided.
- The project is self-hostable: anyone can deploy their own copy of Dragg using their own Supabase project and hosting provider, in which case this document describes the reference/hosted deployment maintained by the project, not a self-hosted fork.

## 3. Accounts and eligibility

- You must provide accurate information when creating an account.
- You are responsible for keeping your password confidential and for all activity under your account.
- You must be legally able to enter into these Terms under the laws that apply to you.

## 4. Acceptable use

You agree not to:

- Use Dragg for any unlawful purpose or to store data you do not have the right to store.
- Attempt to bypass authentication, Row Level Security, or other access controls.
- Interfere with the availability or integrity of the service (e.g., automated abuse, scraping at scale, denial-of-service).
- Use another person's account without permission.

## 5. Your content

You retain ownership of the financial data you enter into Dragg. By using the app you grant the operator of this deployment the limited right to store and process that data solely to provide the app's functionality to you, as described in the [Privacy Policy](./privacy-policy.md).

## 6. Open source and licensing

Dragg's source code is published under the MIT License in the [GitHub repository](https://github.com/fsousac/Dragg). The MIT License governs the code itself; these Terms govern your use of a running instance of the app (for example, the maintainers' hosted deployment).

## 7. Limitations and disclaimer

- Dragg is provided "as is," without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, or availability.
- Dragg is a personal record-keeping and visualization tool. It does not provide financial, tax, investment, or legal advice, and nothing in the app should be treated as such.
- To the maximum extent permitted by applicable law, the maintainers and contributors are not liable for any loss or damage arising from your use of, or inability to use, the app, including data loss.
- The service may be modified, suspended, or discontinued at any time, with or without notice, given its open-source and volunteer-maintained nature.

## 8. Changes to these Terms

Material changes to these Terms will be reflected in this file and recorded in the [Terms version history](#terms-version-history) below, since the document is version-controlled in the public GitHub repository.

## 9. Contact

Questions about these Terms can be raised as a [GitHub issue](https://github.com/fsousac/Dragg/issues). For account-specific or sensitive requests, see the "Contact and requests" section of the [Privacy Policy](./privacy-policy.md).

## Terms version history

| Version | Date | Change |
|---|---|---|
| 0.1.0-draft | 2026-07-18 | Initial draft, pending maintainer review, created alongside the sign-up consent checkbox. |
