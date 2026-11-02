import { defineConfig } from "@playwright/test";

// The tests open the static export (out/) through a plain file server, not the dev server.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: { command: "node e2e/static-server.mjs out 4173", url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 60_000 },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
