# @repo/ui

Shared component library for all three Next.js apps.

**HeroUI v3 is the component base.** Almost every component here is a thin
wrapper around a HeroUI subpath import, and the handful that are not are listed
under [Retained](#retained-components) with the reason. `plans/checklist.md`
records the migration and the decisions behind it — read its final notes before
changing a component's shape.

## The wrapper rule

Only this package imports HeroUI or React Aria. Apps import from `@repo/ui/*`,
always. `rg "@heroui|react-aria" apps/` must stay empty.

```tsx
import {
  Foo as HeroUIFoo,
  type FooProps as HeroUIFooProps,
} from "@heroui/react/foo";
```

Import from the subpath, never the barrel. The alias keeps the local name free
for our own export, which is what consumers see.

## Adding or wrapping a component

1. Check `packages/ui/node_modules/@heroui/react/dist/components/<name>/` for
   the real `.d.ts` and compiled `.js`, and
   `@heroui/styles/dist/components/<name>.css` for the classes it applies.
   HeroUI's docs and NextUI v2's are both wrong about v3 often enough that the
   installed package is the only source worth trusting.
2. Write the wrapper in `src/components/ui/<name>.tsx`. The `"./*"` export maps
   it to `@repo/ui/<name>` — no barrel to update.
3. Add anything new you import to `dependencies` in `package.json`, then
   `npm install` from the repo root.
4. `max-lines` warns at 300 and warnings fail CI. `sidebar` is split across
   `sidebar.tsx`, `sidebar-context.tsx`, `sidebar-group.tsx` and
   `sidebar-menu.tsx` for that reason, with the last three re-exported from
   `sidebar.tsx` so consumers still import only `@repo/ui/sidebar`.

Things that have bitten this package more than once:

- **Fold HeroUI's compound parts.** Every overlay wrapper's `*Content` is
  HeroUI's backdrop + container + dialog (or popover + menu) in one component,
  and `TabsList` is its container + list. Nobody wants fewer than all of them,
  and a caller that has to nest four components correctly will eventually not.
- **Do not use HeroUI's `*.Trigger` parts.** `AlertDialog.Trigger`,
  `Modal.Trigger`, `Popover.Trigger` and `Tooltip.Trigger` all render a
  `<div role="button">`. React Aria's `DialogTrigger` / `MenuTrigger` /
  `TooltipTrigger` already hand their props to a focusable child through
  context, so the shared `Button` **is** the trigger with no wrapper at all.
  For a child that is not a React Aria control — the sidebar's plain
  `<button>` — wrap it in React Aria's `Pressable` (press) or `Focusable`
  (focus only), which clone the child and merge props and refs onto it. That is
  what Radix's `asChild` was doing.
- **Never put `"use client"` on `button.tsx`.** It taints every export,
  including the pure `buttonVariants()` helper that server components in
  `apps/inscripcions` call directly, and breaks static prerendering.
- **HeroUI's Button is a real `<button>` with no polymorphic escape hatch.**
  For a link that looks like a button, put `buttonVariants({...})` on the app's
  own `Link` — never wrap a link in a button.
- **Watch for names that collide with different meanings.** HeroUI's
  `secondary` is a neutral grey where ours is IAESTE blue, and its `Badge` is a
  notification dot where ours is a status label. Both are mapped onto neutral
  HeroUI carriers and repainted by `.button--brand` / `.chip--brand` in
  `globals.css`. Mapping either by name would have looked like it worked.

## Theme tokens

All of them live in `src/globals.css`, in the `@layer base` block:
`:root` for light, `.dark` for the admin's dark mode. HeroUI derives
`--accent-hover`, `--danger-soft-foreground` and friends from the base tokens,
so overriding `--accent` retheme's every variant that uses it.

Below that, an `@layer components` block pins HeroUI's defaults back to the
IAESTE scale. **HeroUI v3 styles through semantic classes, not utilities** —
`buttonVariants()` returns `button button--primary button--md`, and the colour
lives in `--button-bg` / `--button-fg` custom properties the variant class sets.
So a new variant is another `.button--*` class in `globals.css`, not utility
soup in the wrapper. `@heroui/styles` declares
`@layer theme, base, components, utilities`, so anything a caller passes through
`className` still wins.

What is pinned there and why is written in the comments; the recurring themes
are that HeroUI is much rounder than IAESTE (pill buttons, 32px overlays) and
carries floating surfaces on a shadow alone, which leaves a white panel with no
edge against a white page.

The `@theme inline` block at the top of the file maps legacy utility names
(`bg-primary`, `text-muted-foreground`, `border-input`, the sidebar and chart
colours) onto HeroUI's tokens, so app code written before the migration keeps
working.

## React Hook Form

`Form` is React Hook Form's `FormProvider`; HeroUI's `Form` renders an HTML
`<form>`. They are not interchangeable, and this package deliberately does not
export the second one.

One pattern, used by both forms in the repo:

```tsx
<FormField
  control={form.control}
  name="name"
  render={({ field, fieldState }) => (
    <TextField {...fieldProps(field, fieldState)}>
      <FormLabel>nom</FormLabel>
      <Input ref={field.ref} className={FIELD_CONTROL} />
      <FormMessage className={FIELD_HINT} />
    </TextField>
  )}
/>
```

- `@repo/ui/text-field` is the field root. One `useTextField()` call inside
  mints the ids and threads them through React Aria context to the nested
  `Label`, `Input`/`Textarea`, description and `FormMessage`, which is what
  replaced the old `FormItem` / `FormControl` / `useFormField` machinery.
- It sets `validationBehavior="aria"`: the shared Zod schemas own validity, and
  React Aria must never raise a browser validation bubble of its own.
- `fieldProps(field, fieldState)` is the single React Hook Form → HeroUI
  mapping. `field.ref` is deliberately excluded — it belongs on the control,
  because that is what React Hook Form focuses on a failed submit.
- `FormMessage` is HeroUI's `FieldError`, gated on the root's `isInvalid`,
  which is what makes it render once and only when invalid. A control with no
  such root (the year radio group, the OTP, the degree picker) renders its
  message by hand and says so in a comment.

## Retained components

Not everything here is HeroUI, and each exception has a reason:

- **`navigation-menu` (Radix)** — the public site's main navigation. Radix
  tracks which sibling a transition came from and slides the viewport
  accordingly (`data-motion`), and sizes it from
  `--radix-navigation-menu-viewport-height/width`. HeroUI has no equivalent.
- **`command` (cmdk) and `popover` (Radix)** — the registration degree picker's
  ranked filter. HeroUI's `Autocomplete` filters with a boolean predicate and
  keeps the collection in its declared order, which cannot express
  `scoreDegree`'s ranking (word-prefix matches above mid-word ones). `popover`
  is retained only because that picker holds it up.
- **`table`** — plain `<table>` markup. React Aria's table is always
  `role="grid"` with arrow-key cell navigation, and Tab leaves the whole table
  rather than stepping through each row's link and buttons. For an admin list
  whose point is reaching a row's actions, that is a regression, and adding
  grid semantics to a static table is adding behaviour the app never asked for.
- **`button-group`** — HeroUI's `ButtonGroup` is a segmented control (`gap-0`,
  stripped inner radii). Ours is a spacing helper for buttons meant to stay
  distinct.
- **`sidebar*`** — the admin's collapsible sidebar: cookie-persisted state, a
  `Cmd/Ctrl+B` shortcut, an icon-collapsed mode. HeroUI has no sidebar.
  `SidebarMenuButton` stays a plain `<button>` behind a `Slot` because it is a
  link as often as it is a button.
- **`logo`, `social`, `statistic`, `counter`, `typography`, `back-btn`** —
  product components, never shadcn output.

`checkbox` and `switch` are HeroUI-backed but currently rendered by nothing.

## Rules

- **Presentation only.** No `process.env` (ESLint enforces this), no data
  fetching, no app-specific copy. Anything that varies per app is a prop.
- **Consumers own the framework.** `react`, `react-dom` and `next` are peer
  dependencies. Anything else you import must be added to `dependencies` here.
- **Style through `src/globals.css`.** All three apps import it, so a token
  added here reaches all three. There is no JavaScript Tailwind config any
  more — Tailwind 4 reads the stylesheet, and so does Prettier's class sorter
  (`tailwindStylesheet` in `.prettierrc`).
- **`cn()` from `@repo/ui/lib/utils`** merges class names. Prettier sorts
  Tailwind classes inside `cn(...)` and `cva(...)`.
