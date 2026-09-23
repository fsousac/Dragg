# Telegram Bot for Expense Registration — Feasibility

Addresses GitHub issue #61.

## Summary

Feasible and recommended, scoped to a structured-command bot (not free-form
natural language) that reuses Dragg's existing transaction-creation logic
through a new webhook route. A first version — account linking, a fixed
`/gasto <amount> <description>` command, and confirmation — is roughly a
one-to-two-week effort for one engineer, split into the follow-up issues
listed at the end of this document. Free-form NLP parsing, categories/payment
method selection via bot commands, and rich confirmation flows should be
deferred to later iterations.

## Proposed architecture

- A new route, `app/api/telegram/webhook/route.ts`, receives Telegram's
  webhook `POST` requests. Telegram webhooks (not long-polling) fit Dragg's
  existing Vercel/Next.js deployment with no extra always-on process.
- The route parses the incoming message, resolves the Dragg user from the
  message's `chat_id` (see Account linking below), and calls the same
  transaction-creation path used by `app/transactions/actions.ts` /
  `lib/finance/transactions.ts` — the webhook is a new caller of existing
  validated logic, not a parallel implementation. This keeps Zod validation,
  ownership checks, and installment/category rules in one place, per
  `docs/architecture.md`'s existing pattern of routing all mutations through
  Server Actions and server-side finance functions.
- The route runs entirely server-side; it is a Route Handler, not a client
  component, so it can safely use privileged operations without exposing
  anything to the browser.

## Account linking

Telegram has no concept of the app's Supabase session, so a one-time linking
step is required:

1. From the authenticated Dragg web app (e.g. a new section under
   `/settings`), the user requests a linking code via a new Server Action
   (e.g. `app/settings/telegram-actions.ts`). The action generates a
   short-lived, single-use code (a random token with a short TTL, e.g. 10
   minutes) and stores it against `auth.uid()`.
2. The user sends `/link <code>` to the Telegram bot.
3. The webhook route resolves the code, and on success stores the
   `telegram_chat_id` on a new column (or a small dedicated table) tied to
   the user's row, protected by an RLS policy scoped to `auth.uid()` — the
   same ownership pattern already used for every other user-owned table
   (`docs/security.md`: "Mutations that receive... IDs must verify ownership
   before writing").
4. Every subsequent message from that `chat_id` resolves to exactly one
   `user_id`, and the webhook only ever creates transactions for that
   resolved `user_id` — never an ID taken from the message body itself.

The webhook itself must use the Supabase service-role key to read/write the
linking table (a webhook has no end-user browser session to hold an
anon-key session), but per `docs/security.md`'s existing rule "email/password
flows... never use service-role credentials" applying more broadly to
client-rendered code: the service-role key stays inside this server-only
route and is never sent to the client, which satisfies AGENTS.md's "Never use
Supabase service-role credentials in client-rendered code" — a webhook route
is server code by construction, so this is consistent with, not an exception
to, the existing rule.

## Message parsing

Recommend a fixed structured command first, not natural-language parsing:

```
/gasto 25.90 almoço
```

A simple regex/split on the command extracts amount and description
deterministically. This avoids a new NLP dependency (there is no NLP library
anywhere in the current codebase) for a problem a fixed format already
solves, and keeps behavior predictable and testable. Free-text natural
language input is worth revisiting only after the structured flow is proven
useful, as its own follow-up issue.

Category and payment method are out of scope for the first structured
command — default to a configurable "default expense category" and "default
payment method" set once during account linking, editable later from
`/settings`. This keeps the bot's happy path to a single message instead of
a multi-turn dialogue.

## Confirmation flow

After a successful `/gasto` command, the bot replies with the parsed amount,
description, and the transaction ID, so the user has immediate feedback and
an implicit audit trail in their own Telegram chat history. No interactive
confirmation button is needed for v1 (adds bot-command complexity for a
low-risk, easily-correctable action — the created transaction can be edited
or deleted from the web app like any other transaction).

## Error handling and user feedback

- Malformed commands (wrong format, non-numeric amount) get a reply
  explaining the expected `/gasto <amount> <description>` format.
- An unlinked `chat_id` sending any command other than `/link <code>` gets a
  reply asking them to link their account first.
- Any transaction-creation validation failure (e.g. Zod rejects the payload)
  is surfaced back to the user in plain language, not a raw error dump.

## Security requirements

- **No credentials over Telegram.** The linking flow (a short-lived code
  generated inside the authenticated web app) is the only account-proving
  step; passwords or Supabase tokens are never sent through Telegram, per
  the issue's explicit requirement.
- **Webhook signature verification.** Configure Telegram's `secret_token` on
  webhook registration and verify the `X-Telegram-Bot-Api-Secret-Token`
  header on every incoming request, rejecting anything that doesn't match.
- **Rate limiting per `chat_id`.** A simple fixed-window counter (e.g. N
  requests per minute per `chat_id`, stored in Postgres or Upstash Redis if
  one is later introduced) prevents a compromised or malicious chat from
  flooding transaction creation.
- **Strict `user_id` scoping.** The bot can only create transactions for the
  `user_id` resolved from the linked `telegram_chat_id` — this is enforced
  the same way every other mutation in the app enforces ownership
  (`docs/security.md`), so no new authorization pattern is introduced, only
  a new caller of the existing one.
- **Linking code single-use and short-lived**, invalidated immediately after
  successful linking or after its TTL expires, to limit the window an
  intercepted code could be replayed in.

## Hosting and operational requirements

- The webhook route deploys as part of the existing Vercel Next.js
  deployment — no separate server, container, or always-on polling process.
- Telegram requires the webhook URL to be registered once (via the Telegram
  Bot API's `setWebhook` call) after the bot token is created; this is a
  one-time manual/CI step, not a recurring operational burden.
- Bot token storage follows the same pattern as other server-only secrets in
  the project (environment variable, never committed, never exposed to the
  client bundle).
- No additional hosting cost beyond the existing Vercel plan's function
  invocation limits, since traffic volume (one message per manual expense
  entry) is expected to be low relative to normal web traffic.

## Recommendation

Proceed, scoped to the structured-command version described above. Do not
attempt natural-language parsing, multi-turn dialogues, or category/payment
method selection via the bot in the first iteration — each is a meaningful
increase in complexity for a feature whose core value (fast expense capture)
is already delivered by the fixed-command version.

Suggested follow-up issues, in delivery order:
1. **Account linking** — `telegram_chat_id` column/table + RLS policy +
   linking Server Action + `/settings` UI to request a code.
2. **Webhook + structured command parser** — `app/api/telegram/webhook/route.ts`,
   signature verification, `/gasto` parsing, calling the existing
   transaction-creation path, and the confirmation reply.
3. **Rate limiting** — per-`chat_id` throttling on the webhook route.
4. *(Later, only if v1 proves valuable)* natural-language parsing and
   per-message category/payment-method selection.
