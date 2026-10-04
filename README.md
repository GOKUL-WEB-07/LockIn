# LockIn

LockIn is a rule-based 21-day challenge app. People define daily habits, review the rules, commit, complete a daily checklist, and build a streak toward 17 successful days. Two consecutive missed days preserve the current attempt as `RESET` and create a new attempt from Day 1.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS, React Router
- Supabase Auth and PostgreSQL with RLS and transactional SQL functions
- Node's test runner with PGlite for local PostgreSQL domain tests

## Architecture

UI pages call typed services in `src/services/api.ts`. The services make Supabase requests and call RPCs. PostgreSQL is the authority for challenge status, attempts, day evaluation, streaks, coins, purchases, and habit locking. The browser controls forms and local presentation state. See [architecture decisions](docs/architecture.md) for the route map, data model, security boundary, date policy, and design system.

The database migrations are:

1. `202609260001_core.sql`: tables, constraints, RLS, grants, auth profile trigger, domain RPCs.
2. `202609260002_catalog.sql`: pre-built programs, cosmetic items, theme selection RPC.
3. `202609260003_reconciliation_job.sql`: trusted batch reconciliation function.
4. `202609300001_store_themes.sql`: additional purchasable accent themes.
5. `202609300002_store_cosmetics.sql`: profile badges, dashboard effects, and ownership-checked equip RPC.
6. `20261003164421_release_function_permissions.sql`: revoke hosted default grants on internal reward and auth helper functions.
7. `20261003165000_release_catalog_and_reconciliation.sql`: recover missing catalog data and the batch reconciliation RPC without duplicating existing seeds.
8. `20261003165318_release_hourly_reconciliation.sql`: configure hourly reconciliation where `pg_cron` is available.
9. `20261003165503_release_theme_rpc.sql`: restore the ownership-checked theme selection RPC.

## Local setup

1. Install Node.js 20.19+ and Docker Desktop. Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) or use `npx supabase`.
2. Run `npm install`.
3. Start the local Supabase project with `npx supabase start`, then apply migrations with `npx supabase db reset`. The CLI configuration is already in `supabase/config.toml`.
4. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project Connect panel. For a local project, `npx supabase status` shows the URL and a compatible anon key.
5. Run `npm run dev` and open the printed local URL.

For a hosted project, link the CLI project and run `npx supabase db push` after reviewing the migrations. Configure your Auth email confirmation and site URL settings for the deployment. Never put the service role key in a `VITE_` variable.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Type check and production bundle |
| `npm run preview` | Preview the production bundle |
| `npm run lint` | ESLint |
| `npm test` | Migration, domain, and RLS tests in PGlite |

## Product rules

- Duration is always 21 days.
- Habits can be edited while the challenge is a draft. Starting locks the habit structure in SQL.
- A day is successful at 75% completion. The successful day and streak are credited as soon as the threshold is reached. Any remaining habits can still be completed that day.
- One miss resets the current streak; two consecutive misses reset the attempt and preserve it in history.
- At the end of Day 21, 17 or more successful days completes the challenge. Otherwise it becomes retryable.
- A partial unique index and `start_challenge` enforce one active custom challenge per user.
- Reward events have unique keys; purchases load the server price and debit coins atomically.

## Date and reconciliation policy

A challenge captures an IANA timezone at creation. The database calculates the local date in that zone; the browser does not decide the current challenge day. The app reconciles every active challenge on reads and habit completion. The hourly reconciliation migration schedules `select public.reconcile_due_challenges(500)` through `pg_cron` when that extension is available. On another database, configure an equivalent trusted scheduler. Browser roles cannot execute that batch function. A reset attempt starts on the date reconciliation occurs.

Multiple pre-built programs can run alongside one custom challenge. Use the active-challenge selector on the dashboard, checklist, or tracker; the selection carries across navigation. Starting or retrying a challenge selects it automatically.

## Current verification

`npm test` (nine tests), `npm run lint`, and `npm run build` pass locally. The PGlite suite executes every migration in order and models Supabase's hosted default function grants. It checks authenticated draft and program flows, settings, timezone dates, anonymous access denial, threshold math, immediate streak credit, reward idempotency, habit locking, resets, history, Day 21 outcomes, retry, RLS isolation, shop debits, and cosmetic ownership checks.

The October 4 release audit verified live sign-in, authenticated database flows, schema parity, hourly job execution, error recovery, and responsive screens at 1440px, 390px, and 320px. See [release readiness](docs/release-readiness.md) for fixes, evidence, and the remaining checks on the final deployment domain. Notification preferences are stored; outbound reminder delivery is not configured. Avatar uploads and Realtime are not enabled.
## Android browser installation

LockIn can be installed from the sign-in page or Settings using **Install on Android**. Serve the production build over HTTPS (localhost also works for development). The button opens the native browser prompt when available and otherwise shows instructions for Chrome’s **Add to home screen / Install app** menu.

The web manifest and 192px/512px icons are included in `public/` and copied into `dist/` by the build. Configure hosting to serve these static files and fall back to `index.html` for app routes such as `/dashboard`. Installation adds a standalone home-screen app; LockIn still requires an internet connection. Verify the actual installation on Android Chrome after deployment, including dismissing the prompt and launching from the home-screen icon.

## GitHub Pages

The Actions workflow builds and publishes `dist/` to `/LockIn/`. Pages must use GitHub Actions as its source. Repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` supply the public browser client configuration; never use a service-role or secret key. `VITE_BASE_PATH` controls the asset paths and router basename. The build copies the app entry to `404.html` so direct visits to client routes can load the app (Pages returns HTTP 404 on those first document requests).

## Signup email delivery

Hosted Supabase email confirmation uses the project's email provider. The built-in provider allows only two emails per hour across the project and restricts recipients; configure custom SMTP before public signup. In Authentication → Emails → SMTP Settings, enter your provider's host, port, username, password, and verified sender. Set an appropriate email rate limit after connecting the provider. Keep credentials in Supabase, never in this repository or Vite variables. The hosted Site URL should be `https://gokul-web-07.github.io/LockIn/`; signup requests use the deployment base URL as their confirmation destination. Local `supabase/config.toml` settings do not change hosted Auth settings.
