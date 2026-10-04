# UI audit and design direction

## Current journey

Sign in → onboarding → dashboard → define challenge → add habits → review → commit → dashboard → checklist → tracker. Pre-built programs start from a review dialog. Store contains themes, profile badges, and dashboard effects. Profile shows progress and rewards; Settings contains display name, notification preferences, appearance, and account controls. All screens use live Supabase data.

## Findings

- The earlier blue and white cards gave the app a general dashboard feel. The navy and violet system now carries across every route.
- The dashboard repeats the checklist action and gives coins, streak, successful days, and today's work similar prominence. The daily action should lead.
- The challenge flow has four steps, but the habit step puts a details form ahead of habit creation. The next action is below a large edit form.
- Habit editing is compact and functional. Reordering is absent; the current RPC surface has no reorder operation.
- The tracker has clear states, but the 21-day grid competes with three equally sized statistic cards.
- Loading is a centered spinner on every route, which gives little sense of the destination layout.
- Several errors display Supabase messages verbatim. They can be clearer without hiding the ability to retry.
- Mobile navigation is present and has safe-area padding, but its inactive contrast and small labels can improve. A 320px viewport gives each of five items little space.
- The empty dashboard has appropriate copy and actions, but the visual treatment is the same as other empty states.
- The shop has real purchase and apply actions, but cards do not show category or item previews.

## Design direction

**Theme:** a focused, dark commitment journal. The 21-day sequence is the recurring visual signature. Supporting content uses open spacing and quiet borders.

**Palette:** navy canvas `#111526`, raised panels `#1b2036`, primary text `#f7f5ff`, muted text `#a6abc7`, violet action `#8364ed`, and pink completed days. Success, warning, error, and coin colors retain distinct meanings.

**Type:** Manrope for the interface and prominent numbers. Strong weight and compact line length carry hierarchy without oversized headings.

**Layout:** narrow reading widths for forms and checklist; wider editorial grid for dashboard and tracker. Main content is left aligned. On mobile, sections stack and the five key destinations remain in a compact bottom bar.

**Interaction:** actions describe outcomes, keyboard focus stays visible, completion responds immediately, and motion respects reduced-motion settings. Real data remains the only source of progress and rewards.

**Shared UI system:** The dashboard, challenge flow, checklist, tracker, pre-built catalog, profile, shop, authentication, and onboarding use the same canvas, panels, controls, typography, and navigation. The dashboard retains its violet challenge surface and pink completed-day cells. Its hero, daily objective, and 21-day grid map to live challenge data.

## Verification and remaining constraint

The login screen and protected routes were visually reviewed at desktop and mobile widths. Protected-route screenshots used browser-only sample responses to inspect layout without changing Supabase data. The existing backend does not expose a draft habit reorder RPC, so that interaction remains unavailable.
