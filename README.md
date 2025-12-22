# Wajib

Wajib is a modern task and routine manager built with Next.js 16, Supabase, and a polished shadcn/ui experience. The app combines daily checklists, recurring routines, and categorized insights so you can track what matters without juggling multiple tools.

## Highlights
- **Personalized dashboard:** Filter by category, completion status, or grouping (day/week/month) to focus on the work that matters most.
- **Task + routine support:** Create one-off tasks or recurring routines with priorities, recurrence types, and inline editing.
- **Actionable insights:** Toggle an insights view to see progress summaries and completion trends alongside your task list.
- **Fast auth & sync:** Email/password authentication powered by Supabase keeps sessions in sync across tabs and devices.
- **Mobile-friendly UI:** Drawer-based interactions and adaptive layouts make it easy to manage your day from any device.

## Tech Stack
- **Framework:** Next.js 16 (App Router, server components) with TypeScript
- **Data & Auth:** Supabase (PostgreSQL, Row Level Security, email/password auth)
- **UI:** Tailwind CSS, shadcn/ui, Radix primitives, Lucide icons
- **State & Utils:** React hooks, Zod validation, date-fns, and Sonner toasts

## Getting Started
1. **Install dependencies** (pnpm recommended):
   ```bash
   pnpm install
   ```
2. **Create a `.env.local`** with your Supabase project keys:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
   ```
3. **Run the development server:**
   ```bash
   pnpm dev
   ```
   The app will be available at [http://localhost:3000](http://localhost:3000).

## Useful Scripts
- `pnpm dev` – start the app with Turbopack for rapid local iteration
- `pnpm lint` – lint the codebase
- `pnpm type-check` – run TypeScript checks
- `pnpm build` – create a production build
- `pnpm format` – format the project with Prettier

## Project Structure
- `app/` – routes, layouts, and top-level pages (auth flow and dashboard shell)
- `components/dashboard/` – dashboard experience: filters, insights, creation dialogs, item editors, and Supabase provider
- `components/ui/` – reusable shadcn/ui primitives
- `lib/` – Supabase client/server helpers
- `types/` – shared TypeScript definitions for tasks, routines, and categories

## Deployment
The app is ready to deploy to any Next.js-compatible host. Provide the Supabase environment variables above, run `pnpm build`, and serve with `pnpm start` (or your platform’s adapter).
