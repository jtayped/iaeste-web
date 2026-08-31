# Browser verification findings

Manual browser pass over the **inscripcions** and **admin** apps after the
HeroUI v3 migration. Record-only: issues are logged here to fix later.

Servers: web :3000, inscripcions :3003, api :3004, admin :3005. Browser driven
at desktop (1440×900) and mobile (390×844 for registration, 360×640 for admin).

Legend: 🔴 bug · 🟡 polish/UX · 🟢 verified working (no action)

---

## inscripcions (:3003)

### 🟢 Verified working

- Landing `/` — IAESTE navy primary button + outline secondary render correctly.
  "inscriu-te" CTA is a real `<a>` link (Button `asChild` link semantics preserved).
- Step 1 email: empty-submit validation reddens label + border, shows "escriu el
  teu correu", focus lands in the field. Invalid format shows "adreça de correu
  electrònic no vàlida".
- Stepper: step transitions mark completed steps with a check, active step filled
  navy, connector line fills between done steps.
- Step 2 OTP: autofocuses first box; typing 6 digits auto-advances and
  auto-submits on the last digit. Reached step 3 without pressing continua.
- Degree picker (retained cmdk + Radix popover): opens, filters on "engin",
  groups by category ("enginyeria industrial"), shows campus badges
  (lleida/igualada). Arrow-key navigation + Enter selects and commits the value,
  popover closes.
- `curs` button-group (1–6, retained ButtonGroup): selection updates active state.
- Optional note: collapsible expands, toggle label flips "afegeix una nota" ↔
  "amaga la nota", textarea accepts input.
- Submit: pending state shows spinner + "enviant…" and disables the button.
  Full flow completes end-to-end → `/en-revisio` success screen. No console errors.
- Mobile 390px: stepper spreads edge-to-edge with connectors hidden below `sm`,
  card and fields reflow cleanly.

### ✅ FIXED — Double error message on failed OTP submit

After submitting a wrong 6-digit code, the field is cleared and TWO errors show
at once: the "el codi té sis xifres" length hint AND the server error "aquest
codi no és correcte o ja ha caducat. torna-ho a provar." Because the clear drops
the field to 0 digits, the length validator fires alongside the real server
error. Only the server error should show. (code-step)

Fix: the field-level error `<p>` in `code-step.tsx` is now gated on `!error`, so
the length hint is suppressed whenever the server `error` prop is present.
Browser-verified: wrong code shows exactly one line; auto-submit and
clear-on-reject still work.

### ✏️ Change made this session (not a finding)

- Registration stepper (`components/registration/progress.tsx`): switched from
  full-width `flex-1` items to `justify-between` with the last step flush, per
  user request — was offset when centered.

---

## admin (:3005)

### 🟢 Verified working (unauthenticated)

- `/sign-in` renders correctly: LC brand tile, heading, magic-link email field,
  primary "envia'm l'enllaç d'accés" button, helper copy. Migrated Input + Button
  - Label render as expected.
- Magic-link request transport failure surfaces the error correctly ("no hem
  pogut enviar l'enllaç. torna-ho a provar.") in red below the field — the one
  case the form is designed to expose (success is deliberately indistinguishable
  for known/unknown addresses).

### 🟢 Verified working (authenticated)

- The development magic-link fallback now makes local sign-in possible without
  a live Resend key. The API logs the URL and does not let a failed development
  email transport block the request. Production behavior is unchanged.
- The dashboard renders its breadcrumb, title and statistics after sign-in.
- Dark mode renders the navy page ground, dark card surfaces and blue accent
  without an obvious contrast regression.
- Registration search and status filters update the URL and reload server-side
  results. The filtered empty state renders the active query and filter.
- Registration, member, invitation and campaign list and detail routes render
  their breadcrumbs, headings, tables and actions.
- The member export menu contains real `<a download>` items for the current and
  archived campaigns. Escape closes it and returns focus to its trigger.
- The member role selector, invitation drawer, campaign drawer and the campaign
  date picker all open and dismiss. The date picker also works nested inside the
  campaign drawer.
- The account menu opens from both pointer and Enter key activation. Escape
  closes it and returns focus to the account button.
- No accept, reject, role, invitation or campaign mutation was confirmed during
  this record-only pass. Destructive dialogs were opened and cancelled.

### 🟢 Mobile admin at 360×640

- The header, breadcrumb, actions, search and filter tabs fit without page-level
  horizontal overflow.
- Member, invitation and registration tables remain tables and hide secondary
  columns at this width. The table wrappers own any horizontal overflow.
- The five-item invitation and registration tab lists expose a right-scroll
  control instead of overflowing the page.
- The navigation drawer opens to 80% of the viewport, marks the active route and
  closes after navigation. Escape also closes it.
- The invitation drawer has a dedicated scrollable body, so its fields and
  footer remain reachable on a 640px-tall screen.

### ✅ FIXED — Desktop sidebar overlays the page in both states

At desktop width, both sidebar states cover and clip the left edge of the page
instead of reserving space. The spacer computes to `0px` in both states. In the
collapsed state the fixed panel computes to about `100px`, not the intended
`48px`, and still sits over the page.

Fix: converted the 8 bare `-[--x]` utilities to Tailwind 4's `-(--x)` form (see
the audit section). Measured in the running admin afterwards: expanded spacer
`256px`, collapsed spacer/rail `48px` (= 3rem), `<main>` and header start at the
spacer edge — no overlap. No z-index change needed.

The five desktop width classes in
`packages/ui/src/components/ui/sidebar.tsx` use Tailwind 3's bare custom-property
syntax: `w-[--sidebar-width]` and `w-[--sidebar-width-icon]`. Tailwind 4.3.3 emits
literal declarations such as `width: --sidebar-width`, which browsers discard.
The mobile drawer already uses the valid Tailwind 4 form
`w-(--sidebar-width)`.

This affects the dashboard and every list and detail route. On the registration
queue, the expanded panel hides the first table column and clips the page title.

### ✅ FIXED — Collapsed sidebar state does not survive reload

Clicking the toggle or pressing `Ctrl+B` changes the live state correctly and
sets `sidebar_state=false`. Chrome's network events confirm that the next
document request sends that cookie together with the auth cookie. After the
reload completes, the sidebar still renders with `data-state="expanded"`.

The keyboard shortcut itself works in both directions. The persistence path is
the failure.

Root cause: `(app)/layout.tsx` (a Server Component) imported `SIDEBAR_COOKIE_NAME`
from `sidebar-context.tsx`, which is a `"use client"` module — so the string
arrived as a client reference, not `"sidebar_state"`, and the layout was calling
`cookies().get(undefined)`. `defaultOpen` was therefore always `true`.
Fix: `layout.tsx` now uses a local `"sidebar_state"` literal (the shadcn
approach) with a "keep in sync" comment paired to the `document.cookie` write in
`sidebar-context.tsx`. `sidebar.tsx` untouched. Browser-verified both directions
across full reloads and cross-route navigation.

### ✅ FIXED — Shared Select controls have no accessible name

Every migrated Select shows a visible external label, but the native `<select>`
that React Aria renders has no `id`, `aria-label` or `aria-labelledby`. The
visible label's `htmlFor` points to the trigger button instead. Browser snapshots
therefore show an unnamed `combobox`, and React Aria logs:

`If you do not provide a visible label, you must specify an aria-label or aria-labelledby attribute for accessibility`

Confirmed on the campaign pickers, invitation campaign and role fields, and the
member role field. This is a WCAG 4.1.2 failure even though the visible trigger
text makes the control understandable to sighted users.

Fix: `select.tsx` — `SelectTrigger` now reports its `id` to `Select` via
context; `Select` finds `label[for=<id>]`, gives it an id if missing, and passes
`aria-labelledby` to the React Aria root (an explicit `aria-label`/
`aria-labelledby` from the caller still wins). `form.tsx` was already correct.
Verified live on `/invitations`: all three selects now expose a resolved name,
zero React Aria warnings on mount.

### ⚪ NOT A BUG (verification artifact) — AlertDialog cancel does not restore focus

The registration rejection dialog opens with a valid `role="alertdialog"`,
heading, description and reason field. Its cancel button closes it, but focus
moves to `<body>` instead of returning to the row's `rebutja` trigger.

React Aria's `FocusScope` restores focus inside a `requestAnimationFrame`
callback, and rAF never fires in the hidden/offscreen Chrome window the MCP
tools drive. Controlled A/B: reading `activeElement` immediately after Cancel →
`BODY`; the same sequence with screenshots forcing frames in between → focus is
back on the `rebutja` button. The primitive is correct. Worth one more check in
a normal on-screen browser window if one becomes available.

### ✅ FIXED — Campaign calendar is in English

The Catalan-only admin opens its campaign calendar as `August 2026`, with `Mon`,
`Previous`, `Next` and `Today, Monday, 31 August 2026`. The surrounding form is
Catalan. `DatePicker` accepts a locale for its formatted trigger text, but the
underlying calendar receives no Catalan locale provider.

Fix: new `packages/ui/src/components/ui/i18n-provider.tsx` (re-export of React
Aria's `I18nProvider`); admin tree wrapped in `<I18nProvider locale="ca-ES">` in
`apps/admin/src/app/providers.tsx` (region → Monday-first). React Aria ships no
`ca` string bundle, so the two nav-button labels are supplied in `calendar.tsx`,
gated on the locale being Catalan. Verified in the campaign create drawer:
"agost del 2026", "dl. dt. dc. …", Monday-first, "mes anterior" / "mes següent".
Residual: today's cell still reads `Today, …` — React Aria's en-US bundle,
screen-reader-only text, not overridable without reimplementing the cell label.
Accepted as a known gap (the visible calendar is fully Catalan).
Drawer `Close` button: fixed — the two admin drawers (`create-campaign.tsx`,
`invite-form.tsx`) now pass `aria-label="tanca"` on `<DrawerClose>`; the shared
`packages/ui` component stays language-neutral.

### ⚪ NOT A BUG (verification artifact) — React Aria logs sidebar trigger contract warnings

Loading an authenticated route logs repeated warnings that `Focusable` and
`Pressable` children must be focusable, plus one warning that a `PressResponder`
has no pressable child. The source paths are the sidebar's `TooltipTrigger`
wrapping `SidebarMenuButton` and the account `DropdownMenuTrigger`.

`isFocusable()` includes a visibility check. The desktop sidebar is
`hidden md:block`, and on the first client render `useIsMobile()` returns
`false`, so in the narrow offscreen MCP window all ~9 menu buttons mount hidden
for one render before the drawer replaces them — producing exactly 9
`<Focusable>` + 1 `<Pressable>` warnings. Opening the mobile drawer (same buttons,
visible) → zero warnings. At real desktop width the sidebar is visible on first
render, so these should not appear. Dev-only. No change made.

---

## Tailwind 4 custom-property audit

Source search:

```sh
rg '\-\[--[a-zA-Z]' packages/ui/src apps
```

The built admin stylesheet confirms that all four bare custom-property utilities
below compile to invalid CSS. These are deterministic migration defects, not
search-only suspicions.

**✅ ALL FIXED** — the 8 bare `-[--x]` occurrences were converted to Tailwind 4's
`-(--x)` form. `rg '\-\[--[a-zA-Z]' packages/ui/src apps` now returns zero hits.
The `calc(...)` / `theme(...)` arbitrary values (e.g.
`left-[calc(var(--sidebar-width)*-1)]`) were confirmed to compile correctly
under Tailwind 4.3.3 and left as-is.

### ✅ FIXED — Sidebar widths are invalid

- Five occurrences in `packages/ui/src/components/ui/sidebar.tsx` emit
  `width: --sidebar-width` or `width: --sidebar-width-icon`.
- User impact: the expanded rail overlays page content, and the intended 3rem
  icon-only rail width is not enforced.

### ✅ FIXED — Degree popover does not receive the trigger width

- `apps/inscripcions/src/components/form/fields/degree.tsx` uses
  `w-[--radix-popover-trigger-width]`, which emits
  `width: --radix-popover-trigger-width`.
- The browser discards the declaration, so the retained degree picker does not
  get its intended trigger-matched width. Its desktop interaction worked in the
  prior pass, but width and overflow still need rechecking on a narrow viewport.

### ✅ FIXED — Retained popover animation origin is invalid

- `packages/ui/src/components/ui/popover.tsx` uses
  `origin-[--radix-popover-content-transform-origin]`, which emits
  `transform-origin: --radix-popover-content-transform-origin`.
- Opening and closing still work, but scale animation falls back to the browser's
  default transform origin instead of the position Radix computes.

### ✅ FIXED — Sidebar skeleton width variation is ignored

- `packages/ui/src/components/ui/sidebar-menu.tsx` uses
  `max-w-[--skeleton-width]`, which emits `max-width: --skeleton-width`.
- Browsers discard it, so the memoized 50-89% width has no effect and the text
  skeleton expands through its `flex-1` rule.

No other bare custom-property arbitrary-value matches exist under
`packages/ui/src` or the three frontend apps.

---

## Additional findings and requests (2026-08-31)

### ✅ FIXED — Admin sidebar top is clipped by the header

The very top of the admin sidebar is covered by the fixed header. The first nav
section's heading/first item sits behind the header bar instead of below it.

Same root cause as the sidebar-overlay bug: with the width utilities invalid the
spacer was `0px`, so the `z-20` header (in `SidebarInset`) painted over the
`z-10` fixed sidebar. Fixed by the Tailwind 4 `-(--x)` conversion. Measured
afterwards: LC tile at `(14,14)`, header only occupies `x ≥ spacer` — no overlap.

### ✅ FIXED — "Continguts" external link points at localhost in production

The "Continguts" sidebar link resolves to `http://localhost:3006` in prod. It
must point at the deployed blog/CMS URL. Env-derived base URL is missing or
falls back to the dev port.

Root cause: `CMS_PUBLIC_ORIGIN` in `packages/env/src/admin.server.ts` had a
`.default("http://localhost:3006")` that silently applied in prod when the var
was unset. Fix: new `urlRequiredInProduction()` helper in `parse.ts` — no default
under `NODE_ENV=production`, so a missing value now fails env parse at boot.
Applied to `CMS_PUBLIC_ORIGIN` and the new `WEB_PUBLIC_ORIGIN`. Admin `Dockerfile`
gets localhost build placeholders (runner stage sets nothing); `docs/deployment.md`
documents both as required admin env vars (`https://cms.iaestelleida.cat`,
`https://iaestelleida.cat`).

### ✅ FIXED — Email OTP is hard to copy; OTP input mishandles the pasted space

The code renders in the email with a space (`710 304`). Selecting and copying it
carries the space, and on paste the OTP component puts the space into the 4th
box, pushing the 4th digit into that box and dropping the last digit off the
end. Either emit the code without a space in the email, or strip whitespace on
paste in the OTP component (or both).

Fix (both): `registration-challenge-service.ts` `forDisplay()` now returns the
raw 6 digits (email keeps its `tracking-[0.35em]` for readability). The shared
`InputOTP` wrapper now defaults `pattern={REGEXP_ONLY_DIGITS}` and a
`pasteTransformer` that strips non-digits, both overridable. Tests + snapshots
updated. Browser-verified: pasting `"954 417"` fills all six slots and
auto-submits.

### ✅ DONE — Feature: hard-delete a user

Need the ability to fully delete a user and all data relating to them — not the
existing "kick" / "donar de baixa" (deactivate) action. This is a destructive
data-erasure operation (account + associated records), distinct from
deactivation.

Implemented alongside deactivate:

- `packages/db/src/repositories/member-erasure.ts` — `eraseUser(userId)` in one
  transaction, FK-safe order, returns per-table row counts.
- New capability `members.delete` in `packages/auth` — `admin` role only.
- `DELETE /v1/admin/members/:userId` (`adminDeleteMember`), guarded by
  `requireCapability("members.delete")`; revokes sessions; 404 on unknown id.
  OpenAPI + typed client regenerated (additive).
- Admin UI: "elimina definitivament" section in `member-actions.tsx`, destructive
  `ConfirmAction`, `useDeleteMember()` hook, navigates to `/members` on success.
- Tests in `admin-members.test.ts`: capability enforced (403), 404 unknown id,
  full-erasure test asserting every related row gone and a separately-kicked
  member left intact. 10/10 pass; typecheck + lint clean.
- Not driven end-to-end in the browser.
- Audit trail: the `DELETE` handler now emits a structured `logger.warn` line
  (`admin erased user` + actor id/email, target id/email, per-table deleted
  counts). The DB keeps no self-audit row by design — the target and their
  `membership_event` rows are destroyed with them — so this lives in the log
  stream. A queryable "admin X erased user Y" table was considered and
  deferred. (`app.ts`; `AppDependencies.logger` widened to allow optional
  `warn`.)

### ✅ DONE — Feature: sidebar restructure

Reorganise the admin sidebar:

- **Principal** — only "Dashboard".
- **Organització** — Membres, Convits, Sol·licituds, Campanyes.
- Remove the **Equip** section entirely.
- New **Enllaços externs** section (Catalan label) pinned at the bottom of the
  sidebar, with links to: the web, the CMS, and Odoo
  (`https://iaestelleida.odoo.com`).

Done in `nav.ts` + `sidebar-nav.tsx` + `(app)/layout.tsx` + `AGENTS.md`:
`NavGroupId` = `principal | organitzacio`. principal = single `dashboard` item.
organització = `sol·licituds` (pending badge), `membres`, `convits`, `campanyes`.
`equip` group removed (its dashboard stat-grouping `<StatSection title="equip">`
is unrelated and stays). Bottom `enllaços externs` group (`mt-auto`), keys
`web | blog | odoo` — **web** → `WEB_PUBLIC_ORIGIN`, **blog** → `${CMS_PUBLIC_ORIGIN}/admin`,
**odoo** → `https://iaestelleida.odoo.com` (module constant). Per the user's call,
the CMS-admin link is labelled **blog** (not "cms"); there is no separate "cms"
entry. Browser-verified.

### ✅ DONE — Rename: "Panell" → "Dashboard"

Replace "Panell" with "Dashboard" in every instance (nav, breadcrumb, page
title, any copy).

Renamed across the admin app: `nav.ts`, `page-title.ts` (`TITLE_ROOT` + the
double-prefix special-case), `app/layout.tsx` title template, `(app)/page.tsx`,
`breadcrumbs.tsx`, `page-shell.tsx`, `app-sidebar.tsx` mobile description,
`public/sw.js`, `not-found.tsx`, body copy in members/registrations/campaigns
action components, and `AGENTS.md`. `grep -i panell` under `apps/admin` is clean
(only `PanelLeft` the icon remains).
Also renamed (user confirmed): `apps/inscripcions/.../registration/screens.tsx`
success screen — "al panell del comitè" → "al dashboard del comitè".

### ✅ DONE — Rename: "Continguts" → "Blog"

Rename the "Continguts" nav entry to "Blog".

Folded into the restructure (external key/label is `blog`). `docs/content.md`
updated.

---

## Still not browser-verified

- Registration OTP paste and browser autofill.
- Registration already-known, already-registered and recovery states.
- Public contact form and public navigation at mobile width.
- Successful destructive admin mutations and their failure toasts. The API test
  suite covers those state transitions, but this browser pass did not change the
  seeded admin data.
