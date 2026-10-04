# Release readiness — October 4, 2026

The application passes the completed local and hosted checks. The frontend production bundle is built. Public website deployment has not been performed during this audit.

## Fixed during the audit

- Closed a hosted permissions vulnerability: authenticated users could call `grant_reward` and mint coins. Revoked direct and inherited public-client access to that function and three internal helpers. Normal ownership-checked application RPCs retain their intended access.
- Restored three missing pre-built programs, their ten habits, two missing themes, the theme-selection RPC, and the batch reconciliation RPC.
- Installed and scheduled hourly reconciliation. A real scheduled execution succeeded; subsequent runs also reported success.
- Verified the existing database against the repository and, with user approval, recorded the five missing September migration-history entries. Local and hosted versions now agree across all nine migrations.
- Added active-challenge selection to the dashboard, checklist, and tracker. Starting or retrying a challenge selects it automatically, and drafts remain accessible while a challenge is active.
- Reconcile every active challenge, refresh on window focus, and ignore outdated challenge responses after navigation or selection changes.
- Guard against outdated auth/profile responses, report failed profile retries safely, and reset login/signup form state when changing modes.
- Display program-start errors inside the dialog and sort preview habits by their stored order.
- Refresh the account coin balance immediately after habit completion.
- Make backend tests discover all migration files and emulate hosted default function grants, so the reward-permission regression is covered.

## Verification evidence

| Check | Result |
| --- | --- |
| `npm test` | Nine tests passed, zero failures |
| `npm run lint` | Passed |
| `npm run build` | Passed; production bundle in `dist/` |
| `npm audit --json` | Zero reported vulnerabilities |
| Hosted schema comparison | 104 columns, 63 non-null-independent constraints, 12 policies, 20 functions, 29 indexes, one trigger, and access settings on 12 tables match the expected local schema |
| Hosted role tests | Program start, completion, daily threshold, duplicate-reward prevention, internal-function denial, and theme RPC execution passed; transactional test writes rolled back |
| Hosted scheduler | `lockin-hourly-reconciliation`, `0 * * * *`, active; successful run observed |
| Responsive browser checks | Eight signed-in routes at 1440px, 390px, and 320px; 24 combinations with no horizontal overflow, alerts, or JavaScript page errors |
| Live UI workflows | Sign-in, draft creation, reminder time, habit edit, review, rule gating, second-custom-challenge rejection, program start, selection across navigation, habit completion, and immediate coin refresh passed |
| Recovery and routing | Profile failure, failed retry, successful recovery, dialog acceptance, Escape dismissal, sign-out, login/signup form reset, and protected-route redirect passed |
| Test cleanup | Temporary draft and program removed; their reward coin reversed; zero QA challenges remain |

The expected rejected start of a second custom challenge and simulated profile failures produce HTTP error responses during negative tests. These were displayed correctly and did not produce unhandled JavaScript errors.

Browser screenshots and reusable audit scripts are under `output/playwright/` and are ignored by Git. The last responsive screenshots include a temporary program that was subsequently removed.

## Remaining public-release checks

1. Configure the final frontend domain in Supabase Auth Site URL and redirect allowlist, then test sign-in and email confirmation from that deployed domain. Sign-up email delivery/confirmation was not exercised in this audit.
2. Confirm the hosting platform serves `index.html` for React Router paths, and smoke-test a direct visit or refresh on `/dashboard`, `/checklist`, and a challenge URL after publishing.
3. Supply only the Supabase project URL and publishable/anon key as frontend environment variables. Use the verified production build or rebuild with the final deployment environment.
4. Supabase's advisor reports leaked-password protection is disabled. Enable it where supported by the project's plan before public launch. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Notification preferences are saved, but push/email reminder delivery remains unconfigured. Treat that as an explicitly unavailable capability unless a delivery service is added.

The remaining security-definer advisories refer to the 15 intentional application RPCs that validate authentication and ownership and perform transactional mutations. Internal helpers are no longer callable by browser roles. See [the advisor's explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The performance advisor also lists 13 foreign keys without complete covering indexes. Existing query indexes are present; these informational findings were not treated as release blockers or modified during this audit.
