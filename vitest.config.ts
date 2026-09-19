import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Every test renders React in jsdom. jsdom has no layout, so it proves logic (labels, direction,
// keyboard, focus, links), not how right-to-left looks: that evidence is Stylelint plus screenshots in the app.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "legacy/**"],
    restoreMocks: true,
    testTimeout: 15_000,
  },
});
