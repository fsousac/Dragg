# Dragg

Dragg is an open-source personal finance web app for tracking income, expenses, savings, budgets, categories, payment methods, and monthly financial progress.

The project is designed to be simple for non-technical users and inexpensive to operate. The MVP uses a frontend-first architecture with Supabase as the managed backend.

## Features planned for the MVP

- Google OAuth login with Supabase Auth
- User-owned financial data protected by Supabase Row Level Security
- Monthly dashboard
- Transactions management
- Categories grouped by Needs, Wants, Savings, and Income
- Payment methods such as Pix, Cash, Credit Card, and Debit Card
- Budget limits by category
- Charts and progress indicators
- Responsive web experience for desktop and mobile

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Recharts
- Vercel

## Project status

Dragg is in early development. APIs, database schema, and UI structure may change before the first stable release.

See the project documentation in [`docs/`](./docs).

## Local development

```bash
npm install
npm run dev
```

Create a `.env.local` file based on `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never expose Supabase service role credentials in the browser.

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening an issue or pull request.

## Security

Please report security issues responsibly. See [`SECURITY.md`](./SECURITY.md).

## License

Dragg is released under the MIT License. See [`LICENSE`](./LICENSE).
