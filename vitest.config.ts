import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      HOLIDAYS_SKIP_FETCH: "1",
    },
  },
});
