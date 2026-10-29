# Contributing

Thank you for helping. Bug reports, fixes and ideas are all welcome.

## Before you start

- **Bugs:** open an issue with the browser, the device (mouse, touch or pen) and the smallest code that shows it.
- **New options or behaviour:** open an issue first, so we can agree on the API before you write it. The hook does one job and stays small, so some good ideas belong in your own code instead.

## Working on it

You need Node 22 or later.

```bash
npm ci
npm test            # Vitest with Testing Library in jsdom
npm run typecheck
npm run build       # TypeScript into dist/
```

A pull request:

- does one thing, with a test that fails without it,
- adds a line under "Unreleased" in `CHANGELOG.md` saying what people get,
- keeps the package free of runtime dependencies,
- passes CI on Node 22 and 24, with React 18 and 19.

## Releases

Maintainers move the "Unreleased" lines under a new version, bump `version` in `package.json`, tag the commit `vX.Y.Z` and publish to npm.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
