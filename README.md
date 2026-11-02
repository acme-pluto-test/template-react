# pluto-template

A Next.js (App Router) web app exported as static files, the starting point of every `<product>-web` repository.

```
npm ci
npm run lint && npm run typecheck && npm test -- --coverage && npm run build
npx playwright install chromium && npm run e2e     # opens out/, with axe
```

- `NEXT_PUBLIC_BFF_URL` - the product's BFF (empty: same origin)
- `NEXT_PUBLIC_WEBVIEW=1` - webview mode: no global navigation, theme and safe area from the native shell
- `NEXT_PUBLIC_NATIVE_ORIGIN` - the origin of the native shell; unset means no native message is accepted

`src/bridge` is generated from the schema in the contracts repository (`pluto contracts generate --codecs`); do not edit it.
Rename the placeholder with the `react-scaffold` skill. The conventions are in the `react-*` skills of the catalog.
