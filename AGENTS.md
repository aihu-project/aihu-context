# aihu-context

Standalone home of the `@aihu/context` runtime primitive. This package is a
small, zero-dependency leaf in the Aihu graph: it must remain DOM-free and must
not import from another Aihu package.

## Commands

```bash
bun install --frozen-lockfile
bun run check:ci
```

The release workflow runs the same checks, verifies a `context-v<version>` tag
against `package.json`, validates the packed manifest, and publishes only when
the exact package version is not already present on npm.

## Boundaries

- Keep the public package name `@aihu/context` and the `./ssr` export stable.
- Keep `src/` browser and server portable: no DOM, Node, or Aihu package imports.
- Keep tests in `tests/` and run them in the Node Vitest environment.
- Do not add framework-specific dependencies to this leaf package.
- `dist/` is generated and must never be committed.

## Codemap

`.codemap/config.json` is intentionally local to this repository's source
shape. It is tuned for the public API, SSR entry point, and test contract.
