# Dragg

Dragg is an open-source personal finance web app for tracking income, expenses, savings, budgets, categories, payment methods, and monthly financial progress.

The project is designed to be simple to self-host and inexpensive to operate. It uses Next.js for the app layer and Supabase for authentication, Postgres, and Row Level Security.

## Features

- Google OAuth login with Supabase Auth
- User-owned finance data protected by Supabase Row Level Security
- Monthly dashboard with 50/30/20 budget split
- Transaction creation, listing, update, and delete flows
- Spending categories grouped by Needs, Wants, and Savings
- Category emoji icons and monthly limits
- Payment method management
- Pix and Payment/Cash protected as default payment methods
- Read-only account settings populated from OAuth profile data
- Charts and progress indicators
- Responsive desktop and mobile experience

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Recharts
- Vercel

## Project Status

Dragg is in early development. APIs, database schema, and UI structure may change before the first stable release.

## Repository Documentation

- [Architecture](./docs/architecture.md)
- [Database notes](./docs/database.md)
- [Security notes](./docs/security.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Code of conduct](./CODE_OF_CONDUCT.md)
- [Changelog](./CHANGELOG.md)

## Should Database Configuration Be Public?

Yes, the project should include the database schema, migrations, constraints, triggers, and Row Level Security policies needed to reproduce the app.

No, the project must never include credentials, service-role keys, production URLs that reveal private infrastructure, database dumps with real user data, OAuth client secrets, or any `.env.local` file.

This repository includes reproducible database SQL under [`supabase/migrations`](./supabase/migrations). Users should create their own Supabase project and apply these migrations.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- Google OAuth credentials configured in Supabase
- Optional: Supabase CLI for local or remote migration workflows

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/YOUR_ORG_OR_USER/dragg.git
cd dragg
```

2. Install dependencies:

```bash
npm install
```

3. Create environment variables:

```bash
cp .env.example .env.local
```

4. Fill `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

5. Apply database migrations:

```bash
supabase db push
```

If you do not use the Supabase CLI, open the Supabase SQL editor and apply the SQL files from [`supabase/migrations`](./supabase/migrations) in filename order.

6. Start the app:

```bash
npm run dev
```

7. Open:

```text
http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy the publishable key into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Apply all migrations in `supabase/migrations`.
5. Enable Google as an Auth provider in Supabase.
6. Add your local redirect URL:

```text
http://localhost:3000/auth/callback
```

7. Add production redirect URLs before deploying, for example:

```text
https://your-domain.com/auth/callback
```

## Database Schema

The app currently uses these tables:

- `categories`
- `payment_methods`
- `transactions`

The migrations include:

- table definitions
- indexes
- check constraints
- Row Level Security policies
- triggers for `updated_at`
- defaults seeded for new users

Default user data includes category presets and payment methods. Pix and Payment/Cash are protected by the application from edit and delete operations.

## Environment Variables

Only public Supabase browser-safe variables are required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add these to the repository:

- Supabase service-role key
- OAuth client secret
- `.env.local`
- production database connection string
- any real user data

## Scripts

```bash
npm run dev       # Start local development
npm run build     # Production build and type check
npm run start     # Start built app
npm run lint      # Run ESLint
npm audit --audit-level=moderate
```

## Security Checks

Before publishing changes, run:

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

Security expectations:

- Keep RLS enabled on user-owned tables.
- Scope database reads and writes by authenticated user ID.
- Validate Server Action input at runtime.
- Never use `user_metadata` for authorization decisions.
- Never expose service-role credentials to browser code.
- Keep migrations reproducible and free of production data.

See [Security notes](./docs/security.md) and [Security policy](./SECURITY.md).

## Deployment

The project is compatible with Vercel.

1. Import the repository into Vercel.
2. Set the same environment variables used locally.
3. Add the production OAuth callback URL in Supabase.
4. Apply migrations to the Supabase project used by production.
5. Deploy.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

Recommended flow:

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Add migrations for schema changes.
5. Update documentation when behavior changes.
6. Run lint, build, and audit.
7. Open a pull request with a clear description.

Issues and pull requests use templates under [`.github`](./.github).

## License

Dragg is released under the MIT License. See [LICENSE](./LICENSE).
