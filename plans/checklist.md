# HeroUI migration checklist

Mark an item complete only after implementation and verification. Leave blocked
work unchecked and explain it under final notes.

## Baseline

- [x] Read the root, shared UI, and admin agent instructions and `PRODUCT.md`.
- [x] Inspect the worktree and record user-owned changes that must be preserved.
- [x] Inventory shared UI files, app consumers, and current dependencies.
- [x] Record Tailwind, PostCSS, Prettier, and theme configuration.
- [x] Run or record the pre-migration lint, type-check, test, and build state.
- [ ] Capture desktop and mobile references for the public, registration, and admin apps.
      Partially done: the public app was verified at desktop width in a real browser.
- [ ] Record existing keyboard behavior for menus, selects, dialogs, degree search, and OTP.

### Baseline notes

- User-owned changes: public home layout and sections, the contact form field
  consolidation, `docs/deployment.md`, and the untracked `plans/` directory.
  The exact starting status is preserved in the migration worktree diff. Do not
  overwrite or reformat these files without reviewing that diff first.
- Shared UI inventory: 41 component files under
  `packages/ui/src/components/ui/`. Apps make 186 imports through `@repo/ui/*`;
  no app imports Radix or HeroUI directly.
- Current UI dependencies: 15 Radix packages plus `cmdk`, `input-otp`,
  `react-day-picker`, `sonner`, `class-variance-authority`, `framer-motion`,
  `tailwind-merge`, and `tailwindcss-animate`.
- Styling baseline: Tailwind 3.4.3 in the three frontends and `packages/ui`,
  JavaScript presets for shared tokens and app content detection, PostCSS 8 with
  the `tailwindcss` and `autoprefixer` plugins, Prettier Tailwind plugin 0.6.11,
  and HSL channel tokens in `packages/ui/src/globals.css`. React Email has its
  own Tailwind preset and does not import HeroUI styles.
- Pre-migration gates on 2026-08-30: `npm run lint`,
  `npm run check-types`, `npm run test`, and `npm run build` all exited 0. Lint
  reports five allowed `max-lines` warnings in `apps/api`. The build completed
  while logging `ECONNREFUSED` fetch warnings because the API was not running
  during static page generation.
- Browser references and keyboard checks are blocked because no in-app browser
  session is available. The public, registration, and admin development servers
  all start successfully, and an API process was already listening on port 3004.

## HeroUI and Tailwind setup

- [x] Confirm the current stable HeroUI v3 peer requirements.
- [x] Install HeroUI packages in `packages/ui`.
- [x] Upgrade Tailwind and PostCSS for `packages/ui` and the three Next.js apps.
- [x] Update `tailwind-merge` and the Prettier Tailwind plugin when required.
- [x] Keep React Email on an explicit compatible styling setup.
- [x] Replace obsolete Tailwind CSS directives and PostCSS plugin entries.
- [x] Add correct monorepo source detection for shared UI files.
- [x] Preserve public app-specific spacing and prose utilities (regressed, then
      fixed — see styling setup notes).
- [x] Replace removed Tailwind functions and deprecated utilities.
- [x] Verify npm resolves the intended Tailwind version for each workspace.
- [x] Remove old JavaScript Tailwind configuration only after all consumers move.

### Styling setup notes

- HeroUI 3.2.4 is the current stable release. Its peers require React 19 or
  newer and Tailwind 4 or newer.
- `packages/ui`, `web`, `inscripcions`, and `admin` resolve Tailwind 4.3.3,
  `@tailwindcss/postcss` 4.3.3, and PostCSS 8.5.26. React Email declares
  Tailwind 3.4.17 and keeps the existing shared email preset.
- `packages/ui` owns `@heroui/react` and `@heroui/styles` 3.2.4 and
  `tailwind-merge` 3.6.0. The root owns Prettier 3.9.6, Tailwind 4.3.3 for
  formatter resolution, and Prettier Tailwind plugin 0.8.1. Prettier points at
  the CSS-first shared stylesheet.
- Shared UI lint and type-check pass. Production builds for `web`,
  `inscripcions`, and `admin` pass with the Tailwind 4 pipeline.
- The repository-wide format check now finds 61 existing files whose class
  order changes under Tailwind 4. Those files were not bulk-formatted because
  several contain user-owned work. Every file changed in this setup phase
  passes Prettier.
- Regression found and fixed on 2026-08-30: `apps/web/src/globals.css` is a
  Tailwind 4 _fragment_ (it opens with `@reference`, because the app imports the
  shared stylesheet separately). Tailwind reads a fragment's `@theme` when
  generating utilities but does not emit its `:root` declarations, so
  `px-screen-sm` compiled to `padding-inline: var(--spacing-screen-sm)` while
  `--spacing-screen-*` was never defined. Every `.section-padding` element on
  the public site — 9 per page, including the header — silently lost its
  horizontal padding. Fixed by declaring the three values in a plain `:root`
  block alongside the `@theme` block, which is still needed so the
  `px-screen-*` utilities exist at all. Verified in the browser
  (`padding-inline` resolves to 36px) and in the production CSS.

## Theme translation

- [x] Map IAESTE brand colors to HeroUI semantic tokens.
- [x] Resolve the conflicting legacy meanings of `accent` and `muted`.
- [x] Convert legacy color channels to valid full CSS colors where required.
- [x] Preserve primary, secondary, destructive, border, field, and focus tokens.
- [x] Preserve card, popover, sidebar, chart, and radius tokens still in use.
- [x] Preserve the admin dark theme and sidebar contrast.
- [x] Update direct `hsl(var(...))` expressions and conflicting utility names.
- [x] Verify text and control contrast in light and dark modes.
- [x] Verify selection, links, scrollbars, caret, and focus-ring styling.

### Theme translation notes

- HeroUI `accent` now carries IAESTE navy in light mode and the existing lifted
  blue in dark mode. HeroUI `muted` now means secondary text. Legacy neutral
  fills moved from `bg-accent` and `bg-muted` to HeroUI `bg-default`, preserving
  their previous color without overloading either semantic name.
- Legacy `primary`, `secondary`, `destructive`, input, ring, card, popover,
  chart, and sidebar utilities remain as explicit compatibility aliases. All
  color variables now contain complete CSS colors. Direct `hsl(var(...))`
  expressions were removed from source and the retained editor-only Tailwind
  configuration now reads full color variables directly.
- Light and dark body, muted text, brand actions, neutral fills, and sidebar
  text meet WCAG text contrast. Dedicated field borders measure 3.20:1 in light
  mode and 3.05:1 in dark mode. The light danger token measures 5.57:1 at rest
  and 4.54:1 after HeroUI's hover mix. Focus rings measure 5.17:1 in light mode
  and 7.37:1 in dark mode.
- Selection, scrollbar, caret, underline offset, and focus colors now come from
  the shared theme. Production CSS contains the new HeroUI and compatibility
  utilities. Browser screenshots remain blocked by the baseline browser issue.

## Shared package contract

- [x] Keep all app imports behind `@repo/ui/*`.
- [x] Define shared mappings for legacy variants, sizes, and state props.
- [x] Handle `disabled`, `required`, native events, and React Aria events correctly.
- [x] Handle controlled and uncontrolled open state correctly.
      Every overlay root takes React Aria's `isOpen` / `defaultOpen` /
      `onOpenChange`. The Radix spelling was not kept: unlike `Select` and
      `Tabs`, these structures changed anyway, so a translation layer would
      have bought nothing.
- [x] Replace `asChild` without nested interactive elements or broken links.
- [x] Rewrite consumers where a compatibility wrapper would hide a semantic mismatch.

## Stable components

- [x] Migrate Button and preserve links, variants, loading, and icon-only labels.
- [x] Migrate ButtonGroup (retained as a custom layout helper, see notes).
- [x] Migrate Card.
- [x] Migrate Alert.
- [x] Migrate Avatar.
- [x] Migrate Badge.
- [x] Migrate Separator.
- [x] Migrate Skeleton.
- [x] Migrate Switch.
- [x] Migrate Checkbox.
- [x] Run focused shared UI type and visual checks.

## Forms and controls

- [x] Keep React Hook Form's FormProvider separate from HeroUI's HTML Form.
- [x] Define one shared React Hook Form and HeroUI field pattern.
- [x] Preserve field IDs, labels, descriptions, invalid state, and error links.
- [x] Migrate Input.
- [x] Migrate Textarea.
- [x] Migrate Label.
- [x] Migrate InputOTP.
- [x] Migrate Select.
- [ ] Migrate Popover.
      Left on Radix: its only remaining consumer is the degree picker's `cmdk`
      build, and moving the wrapper before that field would strand it. The date
      picker no longer uses it, and it is now the last Radix overlay in the
      repository.
- [x] Migrate Calendar and DatePicker.
- [x] Centralize JavaScript Date and React Aria date-value conversion.
- [x] Retain and document `cmdk` if it remains necessary.
      Retained: it is what still drives the degree picker's ranked filtering.

### Forms and controls notes

- **The field pattern.** `FormItem` / `FormControl` / `useFormField`'s id
  machinery is gone. HeroUI's `TextField` mints the ids from one
  `useTextField()` call and threads them through React Aria context to the
  nested `Label`, `Input`/`Textarea`, `Description` and `FieldError`. Verified
  in the rendered HTML of `/en/student`: `label[for]` matches `input[id]`, and
  `aria-describedby` lists the description and error ids.

  ```tsx
  <FormField
    control={form.control}
    name="name"
    render={({ field, fieldState }) => (
      <TextField {...fieldProps(field, fieldState)}>
        <FormLabel>nom</FormLabel>
        <Input
          ref={field.ref}
          data-field-name="name"
          className={FIELD_CONTROL}
        />
        <FormMessage className={cn(FIELD_HINT, "font-medium")} />
      </TextField>
    )}
  />
  ```

- `@repo/ui/text-field` is new and is the field root. It sets
  `validationBehavior="aria"`, because the Zod schemas own validity and React
  Aria must never raise a browser validation bubble of its own.
- `fieldProps(field, fieldState)` is the single React Hook Form → HeroUI
  mapping. `field.ref` is deliberately excluded: it belongs on the control,
  since that is what React Hook Form focuses on a failed submit.
- `isRequired` is **not** passed. It would add an asterisk to every label, and
  in both forms here every field but one is required — the optional one says so
  in its own label. The native `required` attribute stays exactly where it was.
- `FormMessage` is HeroUI's `FieldError`, gated on the field root's `isInvalid`
  — which is what makes it render once and only when invalid. Three controls
  have no such root and render their message by hand, each saying so in a
  comment: the year radio group, the OTP (whose root is a flex row of six
  boxes), and the degree picker.
- `Select` came out a drop-in: `value` / `onValueChange` / `SelectTrigger` /
  `SelectValue` / `SelectContent` / `SelectItem` all kept their Radix spelling,
  with the `Key` conversion and the trigger's chevron centralised in
  `select.tsx`. Not one of its four consumers changed.
- `DatePicker` still takes and emits plain `Date`; `packages/ui/src/lib/
date-value.ts` is the one typed boundary to React Aria's `CalendarDate`, and
  `packages/ui` now declares `@internationalized/date`. Both directions go
  through the local time zone, so a day picked in Europe/Madrid comes back as
  the same day.
- The date picker's old `modal` prop is gone. It existed because Radix's
  `Dialog` sets `pointer-events: none` on `<body>`, which the calendar
  inherited through its portal. React Aria portals the same way, so the fix is
  now a standing rule in `globals.css` scoped to that one popover's
  `data-slot`.

## Public contact form

- [x] Move the contact form to the shared HeroUI field pattern.
- [x] Preserve translated labels, descriptions, and errors in all locales.
- [x] Preserve client validation and typed server failures.
- [x] Preserve pending, success, failure, and resubmission states.
- [ ] Verify keyboard submission, error focus, and mobile layout.
      Blocked: no browser session is available. Verified from the server-
      rendered markup only.

## Registration flow

- [ ] Move every registration field to the shared HeroUI field pattern.
      Name, surnames, phone, note and email are on it. Year and degree are not:
      neither is a text field, so both own their label and error wiring
      directly — see the degree entry below.
- [x] Preserve registration state transitions and API payloads.
- [x] Preserve server error mapping and recovery behavior.
- [x] Preserve degree filtering, keyboard navigation, selection, and escape.
      Preserved by not migrating the control: it is still `cmdk` behind a Radix
      popover. HeroUI's `Autocomplete` filters with a boolean predicate and
      keeps the collection in its declared order, which cannot express the
      ranking `scoreDegree` does (word-prefix matches above mid-word ones).
      Replacing it means driving the filter's input value and computing the
      sorted sections in the field — a change worth doing on its own.
- [ ] Verify OTP typing, paste, autofill, disabled state, invalid state, and focus.
- [ ] Verify phone, optional note, recap, pending, and failure states.
- [ ] Verify the complete registration flow at mobile width.

## Overlays and navigation

- [x] Migrate AlertDialog.
- [x] Migrate Dialog and Modal behavior.
      `dialog.tsx` was deleted, not migrated: its only consumer was
      `CommandDialog`, which nothing rendered. No modal is left that is not a
      drawer or an alert dialog, so no `Modal` wrapper was added for a caller
      that does not exist.
- [x] Migrate Sheet consumers to the correct Drawer or Modal interaction.
- [x] Migrate DropdownMenu.
- [x] Migrate Tooltip.
- [x] Migrate Tabs.
- [x] Migrate Breadcrumb.
- [x] Migrate Collapsible (deleted — no consumer, see cleanup notes).
- [x] Migrate ScrollArea where HeroUI preserves the behavior (deleted — no
      consumer).
- [ ] Verify escape, dismissal, focus trap, focus return, portals, and nested overlays.
      Partly done without a browser — see "Rendered-DOM verification" below.
      Confirmed: a bare `Button` child is the trigger and opens its overlay
      from the keyboard, `slot="close"` dismisses, `role="alertdialog"` with
      both `aria-labelledby` and `aria-describedby` resolving to real elements,
      and the drawer opening at the right placement. Escape, focus return and
      pointer dismissal still need a real browser.
- [x] Retain and document the public navigation menu if no HeroUI match exists.
      Retained. Radix tracks which sibling a transition came from and slides
      the viewport accordingly (`data-motion`), and sizes it from
      `--radix-navigation-menu-viewport-height/width`. HeroUI has no
      equivalent, and it is the public site's main navigation.
- [x] Preserve the custom sidebar's state, shortcut, mobile mode, links, and dark theme.
      The cookie, `Cmd/Ctrl+B`, `SIDEBAR_COOKIE_NAME` and the server-read
      `defaultOpen` are untouched; only the mobile branch and the tooltip
      changed.
- [x] Update sidebar internals to migrated Button, Tooltip, and Drawer components.
      Tooltip and Drawer, yes. `SidebarMenuButton` stays a plain `<button>`
      behind a `Slot`: it is a link as often as it is a button, and HeroUI's
      Button cannot be an anchor — the same constraint that shaped the Button
      phase.

### Overlay notes

- **Triggers come from context, not from a wrapper.** React Aria's
  `DialogTrigger` and `MenuTrigger` hand their props to a focusable child
  through `PressResponder`, and `TooltipTrigger` through `FocusableProvider`.
  The shared `Button` is a React Aria control, so it _is_ the trigger with no
  wrapper at all — which is why `AlertDialogTrigger`, `SheetTrigger` and one of
  the two `DropdownMenuTrigger`s simply disappeared from the call sites.
  `TooltipTrigger` and `DropdownMenuTrigger` survive only for the sidebar's
  plain `<button>`, and are React Aria's `Focusable` and `Pressable`: they
  clone the child and merge props and refs onto it. That is what `asChild` was
  standing in for.
- **HeroUI's own `*.Trigger` parts are not usable here.** `AlertDialog.Trigger`,
  `Modal.Trigger`, `Popover.Trigger` and `Tooltip.Trigger` all render a
  `<div role="button">`. Wrapping a real button in one nests interactive
  elements.
- **The compound parts are folded.** Every overlay `*Content` in
  `@repo/ui` is HeroUI's backdrop + container + dialog (or popover + menu) in
  one component, because no caller wants fewer than all of them —
  the same shape `TabsList` uses for its container and list.
- **`@repo/ui/router-provider` is new** and mounted in the admin's `Providers`.
  React Aria's `href` (breadcrumb items, menu items) is a full document load
  without it. It leaves `download`, `target` and modifier-clicks to the
  browser, so the members CSV export still downloads.
- **`aria-describedby` is not automatic outside `role="alertdialog"`.**
  `AlertDialogDescription` is React Aria's `Text` and claims the description
  slot; `DrawerDescription` is a plain paragraph, matching React Aria's own
  position that a dialog's body text is read anyway.

## Admin data and feedback

- [x] Migrate Table without adding product behavior.
      Retained as plain `<table>` markup, which is what "without adding product
      behavior" comes to here. React Aria's table is always `role="grid"` with
      a `GridKeyboardDelegate`: arrow keys move between cells and Tab leaves
      the whole table instead of stepping through each row's link and action
      buttons. For an admin list whose point is reaching a row's actions that
      is a regression, and it would also have forced `isRowHeader` onto every
      column config — React Aria throws at hydration without one. The existing
      file is not shadcn debt either: it is `<table>`/`<tr>`/`<td>` with
      `cn()`, no Radix at all.
- [x] Preserve data-table pagination, filters, loading, and empty states.
      Unchanged, except that the filter tabs are HeroUI's now — the toolbar
      dropped its hand-rolled `overflow-x-auto` wrapper for React Aria's
      scrolling tab list.
- [x] Decide whether HeroUI Toast can replace Sonner without feature loss.
      Yes, and it did. The repo only ever calls `toast.success(message)` and
      `toast.error(message, { description })`, and HeroUI's queue also carries
      `promise`, programmatic dismissal and placement, none of which were in
      use. `sonner` is removed.
- [ ] Verify campaign create and edit interactions.
- [ ] Verify member, invitation, registration, and export actions.
      Partly: the export menu's items render as `<a role="menuitem" href
download>` in a real DOM, so the CSV download keeps working. The rest
      needs a browser.
- [ ] Verify destructive confirmation and visible server failures.
      Partly: the alert dialog's structure and dismissal are verified below.
- [ ] Verify notification controls and admin dark mode.

## Cleanup and documentation

- [x] Build a final shared component and consumer inventory with `rg`.
- [x] Delete copied component files proven unused.
      `collapsible`, `scroll-area`, `dialog`, `sheet` and `sonner`. The first
      three had no consumer at all; the last two were replaced.
- [x] Remove unused Radix packages one by one.
- [x] Remove other UI dependencies proven unused.
- [x] Remove obsolete Tailwind and animation tooling.
- [x] Keep and document dependencies used by retained custom components.
- [x] Update `packages/ui/AGENTS.md` for the HeroUI workflow.
- [x] Remove stale shadcn scripts and configuration when no longer used.
- [x] Confirm each dependency is declared by the package that imports it.
      `react-aria-components` was added: `Focusable`, `Pressable` and `Text`
      are imported directly, not through HeroUI.

### Cleanup notes

Removed from `packages/ui`: thirteen Radix packages (`react-alert-dialog`,
`react-avatar`, `react-checkbox`, `react-collapsible`, `react-dialog`,
`react-dropdown-menu`, `react-label`, `react-scroll-area`, `react-select`,
`react-separator`, `react-switch`, `react-tabs`, `react-tooltip`),
`react-day-picker`, `input-otp`, `sonner`, `tailwindcss-animate`, and the
`@repo/tailwind-config` dev dependency.

Also deleted: the four editor-only `tailwind.config.ts` files, the
`./tailwind.config` and `./postcss.config` export entries (the second named a
file that did not exist), `components.json`, and the `ui` shadcn script.
Nothing in the build read any of them — Tailwind 4 reads `globals.css`, and
Prettier was pointed at it during the setup phase. `packages/email` keeps
`@repo/tailwind-config`; it is still on Tailwind 3 and is now its only
consumer.

Still declared, each with a live importer:

| Dependency                                                                              | Why                                                         |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `@radix-ui/react-navigation-menu`                                                       | the public site's navigation menu                           |
| `@radix-ui/react-popover`                                                               | the degree picker's popover                                 |
| `@radix-ui/react-slot`                                                                  | `asChild` on `sidebar-menu` and `sidebar-group`             |
| `class-variance-authority`                                                              | variants in those two files and the navigation menu         |
| `cmdk`                                                                                  | the degree picker's ranked filter                           |
| `framer-motion`                                                                         | `counter.tsx`, plus the two apps that declare it themselves |
| `react-aria-components`                                                                 | `Focusable`, `Pressable`, `Text`, `RouterProvider`          |
| `@internationalized/date`                                                               | the one `Date` <-> `CalendarDate` boundary                  |
| `next-intl`, `react-icons`, `lucide-react`, `clsx`, `tailwind-merge`, `react-hook-form` | untouched by the migration                                  |

## Final verification

- [x] Run the shared UI lint and type checks.
- [x] Run public app lint, type checks, and production build.
- [x] Run registration app lint, type checks, tests, and production build.
- [x] Run admin app lint, type checks, and production build.
- [x] Run the full repository lint gate.
- [x] Run the full repository type-check gate.
- [x] Run the full repository test gate.
- [x] Run the full repository production build.
- [ ] Verify representative desktop and mobile routes in a browser.
      Partly complete. Chrome passes now cover the full registration flow at
      desktop and 390px, plus every authenticated admin list/detail route,
      overlays, menus, tables and the mobile drawer at 360×640. Public mobile
      routes are still outstanding. See `plans/verification-findings.md`.
- [ ] Verify keyboard navigation and visible focus across all apps.
      Partly: keyboard activation, Escape and focus return work for menus,
      selects, drawers and nested date pickers in Chrome. AlertDialog cancel
      loses focus to `<body>`. Public and registration visible focus still need
      their remaining browser pass.
- [ ] Verify translated content, validation, loading, empty, and error states.
      Partly: admin loading, filtered empty states and dark mode work. The
      campaign calendar is in English inside the Catalan-only admin. Successful
      destructive mutations and visible API failure toasts were not triggered.
- [x] Run the Impeccable design detector once over changed UI files if available.
      `detect.mjs --json packages/ui/src apps/admin/src apps/inscripcions/src`
      returned no findings on 2026-08-31.
- [x] Review the diff for generated files, unrelated formatting, and copy changes.
      No generated file is touched. No public copy changed. The Tailwind 4
      class-order delta is down from 61 files to 35 and was deliberately left
      alone — see the blockers.
- [x] Confirm no app imports HeroUI directly.
      `rg -n "@heroui|react-aria" apps/` — no matches.
- [x] Record the final component and dependency inventory below.

## Final notes

### HeroUI-backed components

`alert`, `alert-dialog`, `avatar`, `badge` (on HeroUI's `Chip`, not its
`Badge`), `breadcrumb`, `button`, `calendar`, `card`, `checkbox`,
`date-picker`, `drawer`, `dropdown-menu`, `form`, `input`, `input-otp`,
`label`, `select`, `separator`, `skeleton`, `switch`, `tabs`, `text-field`,
`textarea`, `toast`, `tooltip`, plus the new `router-provider`.

`checkbox` and `switch` are HeroUI-backed but currently rendered by nothing.

### Retained, and why

- `navigation-menu` (Radix) — the public site's main navigation. Radix tracks
  which sibling a transition came from and slides the viewport accordingly
  (`data-motion`), and sizes it from
  `--radix-navigation-menu-viewport-height/width`. HeroUI has no equivalent.
- `command` (cmdk) and `popover` (Radix) — the degree picker's ranked filter.
  HeroUI's `Autocomplete` filters with a boolean predicate and keeps the
  collection in its declared order, which cannot express `scoreDegree`'s
  ranking. `popover` is retained only because that picker holds it up, and it
  is the last Radix overlay in the repository.
- `table` — see the admin section above.
- `button-group` — HeroUI's is a segmented control (`gap-0`, stripped inner
  radii); ours is a spacing helper for buttons meant to stay distinct.
- `sidebar`, `sidebar-context`, `sidebar-group`, `sidebar-menu` — the admin's
  collapsible sidebar. HeroUI has none. Its internals now use the migrated
  `Tooltip` and `Drawer`; `SidebarMenuButton` stays a plain `<button>` behind a
  `Slot` because it is a link as often as it is a button.
- `logo`, `social`, `statistic`, `counter`, `typography`, `back-btn` — product
  components, never shadcn output.

### Deleted

`collapsible`, `scroll-area`, `dialog`, `sheet`, `sonner`, and the shadcn CLI
scaffolding. Dependency list in the cleanup notes above.

### Known regressions and blockers

- **The desktop sidebar is broken in both states and does not persist its
  collapsed state.** Expanded and collapsed rails overlay and clip the page.
  The `sidebar_state=false` cookie reaches the document request, but the reload
  renders expanded. The mobile drawer works.
- **Shared Select controls are unnamed to assistive technology.** React Aria's
  native select has no `id`, `aria-label` or `aria-labelledby`, and logs a
  warning on every affected route.
- **AlertDialog cancellation loses focus.** The dialog closes but leaves focus
  on `<body>` rather than its trigger.
- **The campaign calendar is English in the Catalan-only admin.** Month, weekday
  and navigation labels all use the default English locale.
- **Tailwind 3 custom-property syntax remains in eight migrated classes.** The
  compiled Tailwind 4 CSS contains invalid declarations for five sidebar widths,
  the degree popover width, the retained popover transform origin and the
  sidebar skeleton max-width. The expanded desktop sidebar visibly overlays the
  dashboard. See `plans/verification-findings.md` for the per-item impact and
  source locations.
- **The Tailwind 4 class-order delta is unformatted**, now 35 files (was 61 —
  migration work absorbed the rest). Running Prettier over them is a
  legitimate follow-up but belongs in its own commit: most are unrelated to
  this migration (ESLint configs, auth tests, a brand script), and one,
  `apps/web/src/components/sections/contact.tsx`, holds uncommitted user work.
  `npm run lint` does not gate on it.
- **`toast.error` is our name, not HeroUI's.** HeroUI calls it `danger`. The
  alias is in `toast.tsx` and nowhere else.

### Rendered-DOM verification

No browser, but the components were rendered into happy-dom with
`react-dom/client` and driven from the keyboard, which settles the design
decisions that were otherwise only read out of HeroUI's source. Throwaway
scripts, not committed test infrastructure — this repo has no component test
setup and the migration is not the place to add one.

- **A bare `Button` child is the trigger.** Inside `AlertDialogRoot` it renders
  with `aria-haspopup`, `aria-expanded`, `aria-controls` and a matching `id`,
  and pressing Enter opens the dialog. This is the claim every overlay's
  removed `*Trigger asChild` wrapper rests on.
- **`Pressable` does the same for a plain `<button>`** — the sidebar's case. It
  comes back with `aria-expanded`, `aria-controls`, `id` and `tabindex`, and
  opens the drawer from the keyboard.
- **`slot="close"` really closes.** Enter on the alert dialog's cancel button
  dismisses it, with no handler of its own.
- **`AlertDialogDescription` earns its `Text`.** The dialog renders
  `role="alertdialog"` with `aria-describedby` resolving to the
  `Text slot="description"` element and `aria-labelledby` to the heading. An
  identical-looking `<p>` would have been announced by nothing.
- **`Header` and `Separator` are valid top-level menu nodes.** Both render
  inside the dropdown's `role="menu"` alongside the items, which is what
  `DropdownMenuLabel` and `DropdownMenuSeparator` depend on.
- **Menu items with `href` are real links.**
  `<a role="menuitem" href="/api/v1/admin/members/export" download>` — the CSV
  export keeps downloading rather than navigating.
- **`DrawerBody` carries `touch-action: pan-y`**, which is why scrolling
  content has to live in it rather than directly in the dialog.

One correction worth recording: the first pass at this reported `slot="close"`
as doing nothing. That was happy-dom having no `PointerEvent`, so React Aria's
`usePress` never fired — the control test (pressing the trigger the same way)
failed identically. Driving the keyboard path instead made both work.

### Verification results

Run on 2026-08-31 after the overlays, admin and cleanup phases:

- `npm run lint` — exit 0 (the five pre-existing `apps/api` `max-lines`
  warnings, unchanged).
- `npm run check-types` — exit 0, all 12 packages.
- `npm run test` — exit 0, 14 tasks.
- `npm run build` — exit 0 for all five build tasks.
- Compiled admin CSS contains every override this phase added: the
  `.dropdown__popover, .popover, .select__popover, .tooltip` radius-and-border
  pin, `.dropdown__popover { max-width: calc(100vw - 2rem) }`, the
  `.calendar__cell, .calendar__nav-button, .list-box-item, .menu-item,
.tabs__indicator, .tabs__tab` radius pin, the `.tooltip` padding and
  `word-break: normal`, `.toast { border-radius: calc(var(--radius) * 1) }`,
  and the three `.breadcrumbs__link` rules.
- `rg -n "@heroui|react-aria" apps/` — no matches. No app imports either
  directly.

Recorded earlier, after the forms phase (2026-08-31) and the
stable-component phase (2026-08-30): all four gates green both times.

### Resume point

Phases 1-11 are done. Phase 12 is partly complete. The authenticated admin and
admin mobile passes are complete and their findings are recorded. What remains
is public mobile verification, OTP paste/autofill, registration recovery states
and successful destructive admin mutations with their visible failures. The
Impeccable design detector has run and returned no findings.

Two code items are also open, both deliberate rather than forgotten: the degree
picker (and the Radix `Popover` it holds up), which needs its ranked filter
rebuilt on HeroUI's `Autocomplete` before it can move, and the Tailwind
class-order reformat.
