# Contributing to Dragg

Thank you for your interest in contributing.

## Workflow

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Open a pull request

## Code standards

- Use TypeScript
- Follow existing project structure
- Keep components reusable
- Avoid hardcoding business logic in UI
- Keep data fetching and mutations in server-side modules or Server Actions
- Validate Server Action input at runtime before writing to Supabase
- Verify user ownership for any mutation that receives database IDs from the client
- Keep desktop dialogs, except the new transaction dialog, at the project standard of 50vw by 50vh
- Use existing shadcn/ui primitives and translation keys instead of ad hoc UI text

## Issues

- Use clear titles
- Provide steps to reproduce bugs
- Include screenshots if applicable

## Pull requests

- Keep PRs small and focused
- Describe what changed and why
- Link related issues
- Include database migrations when schema changes are required
- Run `npm run lint`, `npm run build`, and security checks relevant to the change

## Supabase changes

- Add SQL migrations under `supabase/migrations`
- Keep RLS policies aligned with authenticated user ownership
- Do not use `user_metadata` for authorization decisions
- Do not introduce service-role operations into client-rendered code

## Language

All code and documentation must be written in English.
