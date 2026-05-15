<h1 align="center">
	<img width="120" src="public/icon.svg" alt="Dragg" />
</h1>

<h3 align="center">Dragg</h3>

<p align="center">
	Open-source personal finance app built with Next.js and Supabase.
</p>

<p align="center">
	<a href="https://github.com/fsousac/Dragg/actions/workflows/ci.yml">
		<img src="https://github.com/fsousac/Dragg/actions/workflows/ci.yml/badge.svg" alt="CI" />
	</a>
	<a href="https://github.com/fsousac/Dragg/actions/workflows/codeql-analysis.yml">
		<img src="https://github.com/fsousac/Dragg/actions/workflows/codeql-analysis.yml/badge.svg" alt="CodeQL" />
	</a>
	<a href="https://github.com/fsousac/Dragg/blob/main/LICENSE">
		<img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
	</a>
	<a href="https://github.com/fsousac/Dragg/blob/main/package.json">
		<img src="https://img.shields.io/badge/next-16.2.6-black" alt="Next.js" />
	</a>
	<a href="https://github.com/fsousac/Dragg/blob/main/package.json">
		<img src="https://img.shields.io/badge/react-19-149eca" alt="React" />
	</a>
</p>

Dragg is an open-source personal finance web app for tracking income, expenses, budgets, categories, payment methods, subscriptions, goals, reports, and monthly progress.

It is designed to be simple to self-host and inexpensive to operate, with Supabase handling authentication and data security through PostgreSQL + Row Level Security.

### 🔥 Features

- Google OAuth authentication with Supabase Auth
- User-owned finance data isolated via Supabase Row Level Security
- Dashboard with monthly financial summary, planned expenses, and 50/30/20 split
- Full transaction flow: create, list, update, and delete
- Installment expenses and monthly subscription scheduling through transaction records
- Categories organized by Needs, Wants, and Savings
- Category emoji icons and monthly spending limits
- Payment methods management with protected Pix and Cash defaults
- Credit card due-day and closing-day support with planned invoice rows
- Goals screen with create, edit, fund, and delete flows
- Reports screen with monthly summaries, net worth progression, and export-friendly data
- LGPD-oriented privacy request table in the database schema
- Charts and progress indicators powered by Recharts
- Responsive experience for desktop and mobile

### 👉 Getting Started

Requirements:

- Node.js 24.x
- pnpm 10.x through Corepack
- Supabase project
- Google OAuth provider configured in Supabase

Clone and run locally:

```bash
git clone https://github.com/fsousac/Dragg.git
cd Dragg
corepack enable
pnpm install
cp .env.example .env.local
```

Set your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Apply migrations and start:

```bash
supabase db push
pnpm run dev
```

Open `http://localhost:3000`.

If you are not using Supabase CLI, apply SQL files from `supabase/migrations` in filename order through the Supabase SQL Editor.

### 📖 Documentation

- [Architecture](./docs/architecture.md)
- [Database](./docs/database.md)
- [Security Notes](./docs/security.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Changelog](./CHANGELOG.md)

### 📌 Compatibility

Dragg currently targets:

- Next.js 16
- React 19
- TypeScript 5
- Node.js 24.x
- pnpm 10.x
- Supabase Postgres

### 🔐 Security

Security is a core part of the project architecture.

- Keep RLS enabled for all user-owned tables
- Scope reads and writes by authenticated user ID
- Validate Server Action payloads at runtime (recommended with Zod)
- Never expose service-role keys or OAuth secrets in client code
- Keep migrations reproducible and free of production data
- Keep LGPD/privacy workflow data scoped by authenticated user ownership

For vulnerability reports, follow [SECURITY.md](./SECURITY.md).

### 🧪 Scripts

```bash
pnpm run dev            # Start local development server
pnpm run build          # Production build
pnpm run start          # Start built app
pnpm run lint           # Run ESLint
pnpm run test           # Run tests once
pnpm run test:watch     # Run tests in watch mode
pnpm run test:coverage  # Run tests with coverage
```

### 🚀 Deployment

Dragg is ready to deploy on Vercel.

1. Import repository into Vercel.
2. Configure the same environment variables used locally.
3. Add production auth callback URL in Supabase:
   - `https://your-domain.com/auth/callback`
4. Apply migrations to the production Supabase project.
5. Deploy.

The repository also includes GitHub Actions for CodeQL, quality checks, and production Vercel deployment after successful checks on `main`.

### 🙋 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Keep changes focused and include tests when possible.
4. Add migrations for any schema change.
5. Update docs when behavior changes.
6. Run lint, test, and build.
7. Open a pull request with a clear description.

Issue and pull request templates are available under [`.github`](./.github).

### 🔓 License

Dragg is released under the [MIT License](./LICENSE).
