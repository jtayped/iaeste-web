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
