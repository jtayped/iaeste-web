# @repo/ui

Shared component library for both Next.js apps. Mostly shadcn/ui output over
Radix primitives.

## Adding a component

Use the generator rather than writing files by hand:

```sh
npm run ui -- add <component>
```

It writes into `src/components/ui/`, which the `"./*"` export maps to
`@repo/ui/<name>` — no barrel file to update, no export to add.

**The CLI currently fails here** with `Could not resolve the following aliases:
components, ui` — `components.json` points them at `@repo/ui/components` and
`@repo/ui/components/ui`, which this package's `exports` map does not expose
(`"./*"` resolves straight to `src/components/ui/*.tsx`). Until that is
reconciled, copy the component from ui.shadcn.com by hand and adapt it:

- `cn` comes from `@repo/ui/lib/utils`, never `@/lib/utils`.
- Cross-component imports use `@repo/ui/<name>`, never `@/components/ui/<name>`.
- Match the surrounding files, not upstream's latest output: this package is on
  the pre-`data-slot` `default` style — `React.forwardRef` plus an explicit
  `displayName`.
- Add every new Radix (or other) package to `dependencies` below, then run
  `npm install` from the repo root.
- `max-lines` warns at 300 and warnings fail CI. `sidebar` is split across
  `sidebar.tsx`, `sidebar-context.tsx`, `sidebar-group.tsx` and
  `sidebar-menu.tsx` for this reason, with the last three re-exported from
  `sidebar.tsx` so consumers still import only `@repo/ui/sidebar`.

## Rules

- **Presentation only.** No `process.env` (ESLint enforces this), no data
  fetching, no app-specific copy. Anything that varies per app is a prop.
- **Consumers own the framework.** `react`, `react-dom`, and `next` are peer
  dependencies. Anything else you import must be added to `dependencies` here.
- **Style through the shared Tailwind preset** in `tailwind.config.ts` and the
  CSS variables in `src/globals.css`. Both apps extend this preset, so a token
  added here reaches both.
- **`cn()` from `@repo/ui/lib/utils`** merges class names. Prettier is
  configured to sort Tailwind classes inside `cn(...)` and `cva(...)`.
