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
- [ ] Remove old JavaScript Tailwind configuration only after all consumers move.

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
- [ ] Handle controlled and uncontrolled open state correctly.
      Done for `Select` and `DatePicker`; the rest waits on the overlay phase.
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
      picker no longer uses it.
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

- [ ] Migrate AlertDialog.
- [ ] Migrate Dialog and Modal behavior.
- [ ] Migrate Sheet consumers to the correct Drawer or Modal interaction.
- [ ] Migrate DropdownMenu.
- [ ] Migrate Tooltip.
- [ ] Migrate Tabs.
- [ ] Migrate Breadcrumb.
- [ ] Migrate Collapsible.
- [ ] Migrate ScrollArea where HeroUI preserves the behavior.
- [ ] Verify escape, dismissal, focus trap, focus return, portals, and nested overlays.
- [ ] Retain and document the public navigation menu if no HeroUI match exists.
- [ ] Preserve the custom sidebar's state, shortcut, mobile mode, links, and dark theme.
- [ ] Update sidebar internals to migrated Button, Tooltip, and Drawer components.

## Admin data and feedback

- [ ] Migrate Table without adding product behavior.
- [ ] Preserve data-table pagination, filters, loading, and empty states.
- [ ] Decide whether HeroUI Toast can replace Sonner without feature loss.
- [ ] Verify campaign create and edit interactions.
- [ ] Verify member, invitation, registration, and export actions.
- [ ] Verify destructive confirmation and visible server failures.
- [ ] Verify notification controls and admin dark mode.

## Cleanup and documentation

- [ ] Build a final shared component and consumer inventory with `rg`.
- [ ] Delete copied component files proven unused.
- [ ] Remove unused Radix packages one by one.
- [ ] Remove other UI dependencies proven unused.
- [ ] Remove obsolete Tailwind and animation tooling.
- [ ] Keep and document dependencies used by retained custom components.
- [ ] Update `packages/ui/AGENTS.md` for the HeroUI workflow.
- [ ] Remove stale shadcn scripts and configuration when no longer used.
- [ ] Confirm each dependency is declared by the package that imports it.

## Final verification

- [ ] Run the shared UI lint and type checks.
- [ ] Run public app lint, type checks, and production build.
- [ ] Run registration app lint, type checks, tests, and production build.
- [ ] Run admin app lint, type checks, and production build.
- [ ] Run the full repository lint gate.
- [ ] Run the full repository type-check gate.
- [ ] Run the full repository test gate.
- [ ] Run the full repository production build.
- [ ] Verify representative desktop and mobile routes in a browser.
- [ ] Verify keyboard navigation and visible focus across all apps.
- [ ] Verify translated content, validation, loading, empty, and error states.
- [ ] Run the Impeccable design detector once over changed UI files if available.
- [ ] Review the diff for generated files, unrelated formatting, and copy changes.
- [ ] Confirm no app imports HeroUI directly.
- [ ] Record the final component and dependency inventory below.

## Final notes

Record the completed migration state here:

- HeroUI-backed components: `button`, `card`, `alert`, `badge` (on HeroUI's
  `Chip`, not its `Badge`), `avatar`, `separator`, `skeleton`, `switch`,
  `checkbox`, `input`, `textarea`, `label`, `text-field` (new), `form`,
  `input-otp`, `select`, `calendar`, `date-picker`.
- Retained custom components and why:
  - `button-group` — HeroUI's `ButtonGroup` is a segmented control (`gap-0`,
    stripped inner radii). Ours is a spacing helper for separate buttons.
    Swapping it would fuse buttons that are meant to stay distinct.
  - `command` (`cmdk`) and `popover` (Radix) — still the degree picker's
    ranked filter. See the registration section.
  - Everything not yet reached by the migration (overlays, navigation,
    sidebar, table, toast) is still the copied shadcn implementation.
- Remaining UI dependencies: not audited yet; no dependency has been removed.
  `@internationalized/date` was added to `packages/ui`, which now owns the
  `Date` ↔ `CalendarDate` boundary. Radix is still required by the unmigrated
  components, and HeroUI's own `Avatar` is itself built on
  `@radix-ui/react-avatar`. `react-day-picker` no longer has a consumer.
- Known regressions or blockers:
  - **No browser session is available in the current session**, so nothing
    since the stable-component phase has been looked at. The public app was
    checked at desktop width when the Chrome extension was connected. Mobile
    widths, the registration flow, admin dark mode and every keyboard check are
    outstanding.
  - The repository-wide Tailwind 4 class-ordering delta (61 files) is still
    unformatted, because several of those files contain user-owned work.

### Decisions worth carrying forward

- **HeroUI v3 styles through semantic classes, not utilities.** `buttonVariants`
  returns `button button--primary button--md`; the colour lives in
  `--button-bg` / `--button-fg` custom properties set by the variant class. So
  theming happens through the variables the theme phase already mapped, and our
  own variants are added by defining more `.button--*` classes rather than by
  overriding with utilities. `@heroui/styles` declares
  `@layer theme, base, components, utilities`, so anything passed through
  `className` still wins.
- **Two name collisions that fail silently.** HeroUI's `secondary` is a neutral
  grey while ours is IAESTE blue, and HeroUI's `Badge` is a notification dot
  while ours is a status label. Mapping either by name would look like it
  worked. Our `secondary` and `outline` ride neutral HeroUI carriers and are
  repainted by `.button--brand` / `.chip--brand` / `.chip--outline` in
  `globals.css`.
- **HeroUI v3 is much rounder than IAESTE** (pill buttons, 24px cards). Pinned
  back per component in `globals.css` rather than by redefining
  `--radius-2xl` / `--radius-3xl`, which would also move the two blog surfaces
  that use those utilities directly.
- **Button cannot be an anchor.** HeroUI wraps react-aria-components' `Button`,
  which omits `href`/`target`/`rel` and has no `asChild`/`as`/`render`. Since
  `apps/web` mixes `next/link` with next-intl's localised `Link`, an `href` prop
  on the shared Button would hardcode the wrong router. All 24
  `<Button asChild><Link/></Button>` sites became
  `<Link className={buttonVariants({...})}>`.
- **`onClick` survives.** react-aria keeps it as a documented alias for
  `onPress`, so consumers did not churn. It is typed
  `(e: MouseEvent<FocusableElement>) => void`, not
  `MouseEventHandler<HTMLButtonElement>`. Every submit button in the repo
  already carried an explicit `type="submit"`, so RAC's `type="button"` default
  broke nothing.
- **Never put `"use client"` on `button.tsx`.** The directive taints every
  export, including the pure `buttonVariants()` helper, which server components
  in `apps/inscripcions` call directly. It broke static prerendering of
  `/en-revisio` and `/acceptat`. HeroUI's own Button already carries the
  directive, so the wrapper does not need it.

### Resume point

Phases 1-7 are done, minus the two controls called out above (the degree
picker and the `Popover` wrapper it holds up). Resume at phase 9, overlays and
navigation.

Two things the overlay phase inherits:

- `packages/ui/src/globals.css` already carries the standing rule that undoes
  Radix's `pointer-events: none` for React Aria's portalled popover. Once
  `Sheet` and `Dialog` are HeroUI, that rule and its long comment should go —
  React Aria manages its own layer stack, so the conflict disappears with the
  last Radix overlay.
- HeroUI's `PopoverTrigger` is a `<div role="button">`. Do not use it. React
  Aria's `DialogTrigger` gives its trigger props to whatever focusable child it
  is handed through `ButtonContext`, so the shared `Button` is the trigger and
  the element stays a real `<button>`.

Full API and consumer inventories for phases 6 and 9 are in the scratchpad:
`heroui-forms-api.md`, `heroui-overlays-api.md`, `form-consumer-inventory.md`,
`consumer-inventory.md`, `heroui-api.md`, `current-components.md`.

### Verification results

Run on 2026-08-31 after the forms phase:

- `npm run lint` — exit 0 (the five pre-existing `apps/api` `max-lines`
  warnings, unchanged).
- `npm run check-types` — exit 0, all 12 packages.
- `npm run test` — exit 0, 14 tasks.
- `npm run build` — exit 0 for all five build tasks.
- Compiled CSS for `web` and `admin` contains the `--field-radius` override,
  the `aria-invalid` invalid ring on `.input` and `.textarea`, the
  `.popover, .select__popover` radius-and-border pin, the
  `.calendar__cell, .calendar__nav-button, .list-box-item` radius pin, the
  `.textfield[data-invalid] [data-slot=description] { display: block }`
  override, and `[data-slot=date-picker-popover] { pointer-events: auto }`.
- The server-rendered contact form on `/en/student` shows the field wiring
  working: `label[for]` matches `input[id]`, `aria-labelledby` points at the
  label, and `aria-describedby` carries the description and error-message ids.
- `rg -n "@heroui" apps/` — no matches. No app imports HeroUI directly.

Recorded earlier, after the stable-component phase (2026-08-30):

- All four gates green. Compiled CSS contained `.button--brand`,
  `.button--link`, `.chip--brand`, `.chip--outline`, the `.alert--danger` /
  `.alert--accent` border rules and the `.card` override; `.button` resolved to
  `calc(var(--radius) * .75)`, not HeroUI's `calc(var(--radius) * 3)`.
- Browser check at 1440px on `/en` and `/en/student`: brand colours, card
  `accent` bar clipping, button radius and section padding all correct.
