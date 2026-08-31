# Handoff — HeroUI v3 migration, browser verification pass

Date: 2026-08-31. Scope of this session: run the apps and browser-verify the
**inscripcions** and **admin** apps against `plans/plan.md` / `plans/checklist.md`
(phase 12 browser work, which the previous session left blocked on "no browser").
A Chrome extension was connected this session, so the flows below were driven for
real. Detailed per-item log lives in `plans/verification-findings.md`; this file
is the summary + next steps.

Mode note: partway through, the user asked to **record issues, not fix them**.
So most findings below are logged, not resolved. The few changes actually made
this session are called out explicitly under "Changes made this session".

---

## How to run everything locally

All four dev servers (ports): web `3000`, inscripcions `3003`, api `3004`,
admin `3005`. Postgres runs in the existing `postgres-general` Docker container
on `5432` (already up; not started by us). Start each app with:

```sh
npm --workspace <web|inscripcions|admin> run dev   # next dev
npm --workspace @repo/api run dev                  # tsx watch
```

Env is `.env` at repo root (loaded via `dotenv -e ../../.env`).

### Signing into admin locally (NEW dev feature — see below)

Admin is magic-link only and the local `RESEND_API_KEY` is a placeholder, so
email never sends. As of this session, **in dev the magic-link URL is printed to
the API server log**. To sign in:

1. Go to `http://localhost:3005/sign-in`, enter an email that has an account with
   the `admin` role (e.g. `jtayped@gmail.com` — already seeded as admin), submit.
2. Grab the URL from the API log:
   `grep "magic-link sign-in" -A1 <api log>` →
   `http://localhost:3005/api/auth/magic-link/verify?token=...&callbackURL=%2F`
3. Navigate to it. You're signed in. (Tokens expire in 10 min, single use.)

Seeded admin users: `jtayped@gmail.com`, `admin-tables@example.com` (both role
`admin`). Other seeded users are members.

---

## Changes made this session (intentional, not yet committed)

1. **`packages/auth/src/index.ts` — dev magic-link feature.** In `sendMagicLink`,
   when `config.runtime !== "production"`, the sign-in URL is logged to the server
   console (`[dev] magic-link sign-in for …`), and a failing email transport is
   logged-and-swallowed instead of failing the request. Production behaviour is
   unchanged (email is the only path; a send failure still surfaces). Requested by
   the user as a permanent dev-ergonomics feature so local dev doesn't need real
   email. Documented in `docs/auth.md` (new "Local development" subsection).

2. **`apps/inscripcions/src/components/registration/progress.tsx` — stepper layout.**
   Changed the step indicator from full-width `flex-1` items to `justify-between`
   with the last step flush, per user request (it looked offset when centered).
   The connector line stays `flex-1` between steps; last item is not `flex-1`.

3. **`docs/auth.md`** — documents feature #1.

4. **`plans/verification-findings.md`** (new) — detailed verification log.

Everything else in `git status` (blog/page/section files, `docs/deployment.md`,
`contact.tsx`) is **pre-existing user work**, untouched by this session — leave it.

---

## Verified working

### inscripcions (`:3003`) — full registration flow end to end ✅

- Landing `/`: navy primary + outline secondary buttons; "inscriu-te" is a real
  `<a>` link (Button `asChild` link semantics preserved through the migration).
- Step 1 email: empty-submit and invalid-format validation both reddens label +
  border, show the right message, and focus the field.
- Stepper: completed steps get a check, active step filled navy, connectors fill.
- Step 2 OTP: autofocuses first cell; typing 6 digits auto-advances and
  auto-submits. (To get the real code in dev: it's SHA-256(`email:code`) in
  `email_challenge.code_hash` — brute-forceable for a test address, which is how
  this flow was driven.)
- Degree picker (retained cmdk + Radix popover): filters, groups by category,
  shows campus badges, arrow-key + Enter selects and commits, popover closes.
- `curs` button-group (retained ButtonGroup): selection works.
- Optional-note collapsible: expands, label toggles, accepts input.
- Submit: spinner + "enviant…" pending state, disables button; completes to
  `/en-revisio` success screen. No console errors.
- Mobile 390px: stepper and card reflow cleanly.

### admin (`:3005`) — after signing in ✅

- Dashboard renders: breadcrumb, heading, stat cards (sol·licituds / equip).
- Sidebar **collapsed** (icon rail) state renders and content reflows.
- **Dark mode** ("mode fosc" toggle): navy ground, dark card surfaces, blue
  accent — looks correct.
- Sign-in page (unauthenticated): brand tile, magic-link field, button, helper
  copy all render; transport-failure error path shows correctly.

---

## Bugs found (RECORDED — not fixed)

### 🔴 1. Admin sidebar overlays/clips content when expanded — Tailwind v4 miss

**Symptom:** with the sidebar expanded at desktop width, it sits _on top of_ the
main content and clips the left edge of the dashboard cards instead of pushing
them right. Collapsing "works" only incidentally (the panel shrinks to its icon
content, not because width classes apply).

**Root cause (confirmed by DOM measurement):** in
`packages/ui/src/components/ui/sidebar.tsx` the desktop sidebar uses the
**Tailwind v3** bare-custom-property arbitrary-value syntax `w-[--sidebar-width]`
(and `w-[--sidebar-width-icon]`). Tailwind v4 **removed** the implicit `var()`
wrapping for `*-[--foo]`; these now emit invalid `width: --sidebar-width` and are
dropped. Consequences:

- The **spacer div** (the element whose whole job is to reserve the sidebar's
  width in normal flow) computes to `width: 0px` instead of 256px, so the fixed
  sidebar panel has nothing holding space for it and overlays the content.
- The fixed panel's width comes only from its intrinsic content (~209px), and the
  icon-collapse width class also no-ops.

**Proof:** `--sidebar-width` resolves to `16rem` and `--sidebar-width-icon` to
`3rem` (the vars are fine). The **mobile** DrawerContent on line 68 already uses
the correct v4 syntax `w-(--sidebar-width)`, but the 5 desktop occurrences were
left as `w-[--sidebar-width]`. So this is a straightforward migration oversight.

**Fix:** convert the 5 bare occurrences to the v4 parenthesis shorthand
`w-(--sidebar-width)` / `w-(--sidebar-width-icon)` (matching line 68), or the
explicit `w-[var(--sidebar-width)]`. Occurrences: the `collapsible === "none"`
branch, the spacer div (base + `group-data-[collapsible=icon]:` variant), and the
fixed panel div (base + `group-data-[collapsible=icon]:` variant). After fixing,
re-verify expand/collapse pushes content, the cookie-persisted collapse state,
the keyboard shortcut, mobile drawer, and dark mode.
**Also audit the rest of the repo for the same `*-[--var]` pattern** — if the
sidebar slipped through, other migrated components may have too:
`rg '\-\[--[a-z]' packages/ui/src apps` and convert any real matches.

### 🟡 2. inscripcions OTP: double error on a failed code submit

After submitting a wrong 6-digit code, the field is cleared and **two** errors
show at once: the length hint "el codi té sis xifres" _and_ the server error
"aquest codi no és correcte o ja ha caducat." The clear drops the field to 0
digits, so the length validator fires alongside the real error. Only the server
error should show. File: `apps/inscripcions/src/components/registration/code-step.tsx`.

---

## Not yet verified (next steps)

Authenticated admin surface was only partially walked (dashboard + dark mode +
sidebar). Still to do, now that local sign-in works:

- **Fix bug #1 first**, then re-verify the whole sidebar interaction set the
  checklist calls for (collapse persistence via cookie, keyboard shortcut, mobile
  drawer, active links, tooltips, dark mode).
- **sol·licituds** (registrations) queue + detail: row actions, accept/reject,
  destructive confirmation (AlertDialog), visible server failures.
- **membres** / **convits**: member and invitation actions, dialogs, dropdowns.
- **campanyes**: create + edit interactions.
- Export menus (CSV `<a download>` menu items — verified structurally in the prior
  DOM-only pass, not clicked in a browser).
- Tables: pagination, filters, loading, empty states.
- Tooltips, DropdownMenu open/dismiss/escape/focus-return, nested overlays.
- Admin at mobile width.
- inscripcions: OTP paste + autofill specifically (typing verified; paste/autofill
  not), and the "already registered"/recovery states.
- Run the Impeccable design detector over the changed UI files (checklist item,
  still unchecked).

## Open code items carried over from the migration (unchanged, by design)

- Degree picker still on cmdk + Radix `Popover` (the last Radix overlay) — needs
  its ranked filter rebuilt on HeroUI `Autocomplete` before it can move. See
  `plans/checklist.md` notes.
- Tailwind v4 class-order reformat (31 files fail `format:check`) — deliberately
  deferred to its own commit; `lint` doesn't gate on it. NOTE: this is _class
  ordering_, a separate concern from bug #1 which is _invalid class syntax_.

## Verification commands (all green as of last run, 2026-08-31)

`npm run check-types` → 12/12 pass. `rg -n "@heroui|react-aria" apps/` → no direct
imports in apps. (Bug #1 is a runtime-CSS defect that type-checks and lints fine.)
