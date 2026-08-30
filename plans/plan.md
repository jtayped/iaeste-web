# HeroUI migration plan

## Prompt

Migrate the `iaeste-web` monorepo from its copied shadcn and Radix component
set to HeroUI v3. Complete the work on one branch as one migration. Use
`plans/checklist.md` as the live record and mark tasks as they are verified.

This is a component-library migration, not a redesign. Preserve the IAESTE
brand, current layouts, responsive behavior, copy, validation rules, app flows,
dark mode, and accessibility. HeroUI should replace components where it has a
sound behavioral match. Keep product-specific components when forcing a
HeroUI replacement would remove behavior.

Work from the repository root. Read these files before changing code:

- `AGENTS.md`
- `PRODUCT.md`
- `packages/ui/AGENTS.md`
- `apps/admin/AGENTS.md`
- `packages/ui/package.json`
- `packages/ui/src/globals.css`
- `packages/ui/tailwind.config.ts`
- `tooling/tailwind/tailwind.config.ts`
- `plans/checklist.md`

The worktree may contain unrelated user changes. Treat them as user-owned.
Do not reset, revert, reformat, or overwrite them. Inspect the diff before
editing a modified file.

## Checklist contract

Work through `checklist.md` in order. Change `[ ]` to `[x]` only after the code
and its verification are complete. Do not mark a task complete because a file
was edited. Leave blocked work unchecked and explain the blocker under the
final notes.

Keep the repository usable between phases. Run focused checks after each
component group, then run the full repository gates at the end.

## Migration rules

- Apps continue importing UI through `@repo/ui/*`.
- Do not import HeroUI directly in `apps/web`, `apps/inscripcions`, or
  `apps/admin`.
- Add every dependency to the package that imports it.
- Keep React Hook Form and the shared Zod schemas.
- Keep all spreadsheet writes behind `apps/api`.
- Do not hand-edit generated API or CMS files.
- Do not change public copy as part of the component migration.
- Preserve link semantics. Do not replace links with click handlers.
- Preserve visible failures, pending states, keyboard behavior, and focus
  management.
- Remove a dependency only after `rg` proves that no retained component uses
  it.

## 1. Establish the baseline

Inspect the current component inventory, app consumers, package ownership,
Tailwind configuration, PostCSS configuration, and theme variables. Record
which files already have user changes.

Run the repository checks before migration when the worktree permits it. If a
check already fails, record the exact failure in the checklist so it is not
misattributed later.

Capture visual references for these views:

- Public home page at desktop and mobile widths
- Public contact form with normal and invalid states
- Registration flow at desktop and mobile widths
- Admin sign-in page
- Admin dashboard, table, form, menu, and dialog states
- Admin dark mode

Record keyboard behavior for menus, selects, dialogs, the registration degree
picker, and OTP entry before replacing them.

## 2. Install HeroUI and upgrade the styling foundation

Use the current stable HeroUI v3 packages. Check their peer requirements before
editing manifests. Install HeroUI in `packages/ui`, because the shared package
owns component implementations.

Upgrade the three Next.js frontends and `packages/ui` to the Tailwind CSS and
PostCSS versions required by HeroUI. Update the Prettier Tailwind plugin and
`tailwind-merge` when their installed versions do not support the selected
Tailwind release.

Keep `packages/email` on its existing styling setup unless its own toolchain
requires a change. React Email does not need HeroUI. If two Tailwind versions
must coexist in the workspace, declare them in the owning packages and verify
that npm resolves each package correctly.

Move the frontend styling setup to supported CSS-first configuration:

- Replace obsolete `@tailwind` directives.
- Replace the old PostCSS plugin entry.
- Add explicit source detection for shared UI files in the monorepo.
- Preserve app-specific utilities such as public section padding.
- Replace removed Tailwind functions and deprecated utilities.
- Keep class sorting and `cn()` merging correct for Tailwind v4.
- Remove JavaScript Tailwind configuration only after every consumer has moved.

Do not add a HeroUI provider unless the selected HeroUI version requires one.
Follow the current v3 setup rather than older HeroUI or NextUI instructions.

## 3. Translate the IAESTE theme

HeroUI and the current shadcn theme reuse names such as `accent` and `muted`
with different meanings. Build an explicit semantic mapping. Do not let one CSS
variable mean a brand action in HeroUI and a neutral hover background in legacy
components.

Preserve:

- IAESTE navy as the main action color
- IAESTE blue as the secondary brand color
- White public backgrounds
- Current foreground and muted-text contrast
- Border and form-field treatment
- Destructive colors and readable foregrounds
- Focus rings
- Current radius scale
- Admin dark mode and sidebar colors
- Selection, scrollbar, link, and browser focus styling

Convert legacy color variables to full CSS color values where HeroUI requires
them. Update direct `hsl(var(...))` usage and legacy utility names that conflict
with HeroUI tokens. Keep temporary compatibility aliases only while consumers
still need them.

Test light and dark contrast before migrating components. The theme must still
look like IAESTE after HeroUI styles load.

## 4. Preserve the shared package boundary

Keep the existing `@repo/ui/<name>` export paths. Replace implementations
behind those paths or migrate all consumers deliberately when the old and new
component structures cannot share an honest wrapper.

Centralize prop mappings instead of repeating them in apps. Review these API
differences for every migrated component:

- `disabled` and `isDisabled`
- `required` and `isRequired`
- `onClick` and `onPress`
- Native change events and React Aria value events
- Controlled and uncontrolled open state
- `asChild` and HeroUI's render composition
- Legacy variant and size names
- Radix data attributes and React Aria data attributes

Do not make a compatibility wrapper that spreads invalid DOM props or creates
nested interactive elements. Rewrite the affected consumers when a wrapper
would hide a semantic mismatch.

## 5. Migrate stable components

Migrate the low-coupling shared components first:

- Button
- ButtonGroup
- Card
- Alert
- Avatar
- Badge
- Separator
- Skeleton
- Switch
- Checkbox

Preserve current import paths and supported variants. Keep Next.js links as
links when replacing Button's `asChild` behavior. Keep icon-only accessible
names, loading behavior, disabled behavior, and focus styles.

Run focused UI type checks and inspect representative app views before moving
to forms.

## 6. Migrate form controls and validation presentation

The existing `Form` export is React Hook Form's `FormProvider`. HeroUI's `Form`
renders an HTML form. They are not interchangeable. Keep those responsibilities
separate and avoid nested forms.

Use one shared integration pattern:

- Keep `Form`, `FormField`, and `useFormField` as React Hook Form adapters.
- Pass field IDs, labels, descriptions, invalid state, and messages to HeroUI
  controls through shared wrappers.
- Keep errors driven by the existing shared Zod schemas and server results.
- Preserve the controlled or uncontrolled behavior expected by React Hook Form.
- Render each label, description, and error once.

Migrate these controls:

- Input
- Textarea
- Label
- InputOTP
- Select
- Popover
- Calendar and DatePicker

The current DatePicker accepts JavaScript `Date`, while HeroUI uses React Aria
date values. Put conversion in one typed shared boundary or update the complete
data flow. Test formatting, clearing, limits, disabled dates, form errors, and
use inside an overlay.

Keep `cmdk` for command behavior when HeroUI has no equivalent that preserves
filtering and keyboard interaction.

## 7. Migrate the public contact form

Update the public contact form to the shared HeroUI field pattern. Preserve:

- Catalan, Spanish, and English labels and messages
- Client and server validation
- Pending, success, and failure states
- Typed failures shown to the user
- Keyboard submission and error focus
- Existing email and API behavior

Test long translated labels and messages at mobile width. Do not change the
contact schema or duplicate it in the app.

## 8. Migrate the registration flow

Update every registration field and screen that consumes migrated controls.
Preserve the registration state machine, API payload, server error mapping,
verification code behavior, degree search, phone input, optional note, recap,
and recovery states.

Test OTP keyboard entry, paste, autofill, invalid state, disabled state, and
focus movement. Test the degree picker with arrow keys, selection, escape,
filtering, and mobile interaction.

Do not change registration data shapes or create app-local validation schemas.

## 9. Migrate overlays and navigation controls

Migrate HeroUI-compatible overlay and navigation components:

- AlertDialog
- Dialog and Modal
- Sheet, using Drawer or Modal according to the interaction
- DropdownMenu
- Tooltip
- Tabs
- Breadcrumb
- Collapsible
- ScrollArea where HeroUI has a behavioral match

Test controlled state, dismissal, escape, focus trapping, focus return,
portals, nested overlays, disabled menu items, and mobile drawers.

HeroUI has no direct replacement for the public Radix navigation menu or the
custom admin sidebar. Keep them when they remain the clearest implementation.
Update their internal Button, Tooltip, and Drawer usage to migrated shared
components without changing layout or state behavior.

Preserve the sidebar's collapse state, keyboard shortcut, cookie persistence,
mobile state, active links, tooltips, and dark mode.

## 10. Migrate admin data and feedback components

Migrate the shared Table implementation while preserving the current data-table
semantics. Do not add sorting, row selection, resizing, or virtualization unless
the admin already uses it.

Assess Sonner against HeroUI Toast. Migrate notifications only if the shared
API can preserve success, error, promise, dismissal, and placement behavior.
Otherwise retain Sonner as a documented utility.

Test:

- Dashboard cards and pending states
- Campaign creation and editing
- Member and invitation actions
- Registration queue and detail actions
- Export menus
- Notification controls
- Tables, pagination, filters, and empty states
- Destructive confirmation and server failures

Errors must remain visible to the user.

## 11. Remove dead code and update documentation

Build a final import inventory with `rg`. Delete copied component files only
after every consumer has moved or the component has been explicitly retained.

Remove unused Radix packages, `class-variance-authority`, animation packages,
calendar packages, notification packages, and old Tailwind tooling one by one.
Keep dependencies required by retained custom components.

Update `packages/ui/AGENTS.md` so it describes:

- HeroUI as the maintained component base
- The `@repo/ui/*` wrapper rule
- How to add or wrap a HeroUI component
- Where theme tokens live
- How React Hook Form integrates with HeroUI
- Which custom components remain and why

Remove stale shadcn CLI scripts and `components.json` only when they no longer
have a supported use.

## 12. Run final verification

Run focused checks while iterating, then run every repository gate:

```sh
npm run lint
npm run check-types
npm run test
npm run build
```

Verify representative desktop and mobile routes across all three frontends.
Check admin dark mode. Test keyboard navigation, visible focus, overlay focus
return, translated content, validation errors, loading states, empty states,
and destructive actions.

Run the Impeccable design detector once over the changed UI files if it is
available. Review the final diff for generated files, unrelated formatting,
direct HeroUI imports in apps, stale dependencies, and accidental copy changes.

Finish the checklist with:

- HeroUI-backed shared components
- Retained custom components and reasons
- Remaining non-HeroUI UI dependencies and reasons
- Known regressions or unchecked blockers
- The exact verification commands and results

## Definition of done

The migration is complete when HeroUI-compatible components use HeroUI through
`@repo/ui`, retained custom components are documented, the IAESTE theme and app
behavior remain intact, dead shadcn code and dependencies are removed, and all
repository checks pass or have a clearly documented pre-existing failure.
