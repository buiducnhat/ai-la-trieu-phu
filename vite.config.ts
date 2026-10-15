import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

// Vitest không cần (và không nên nạp) plugin Cloudflare/Start.
const isTest = Boolean(process.env.VITEST);

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Marker import của Start; stub cho test chạy ngoài môi trường Start.
      "@tanstack/react-start/server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
  plugins: isTest
    ? []
    : [
        cloudflare({ viteEnvironment: { name: "ssr" } }),
        tanstackStart(),
        // Plugin React của Vite phải đứng sau plugin của Start.
        viteReact(),
      ],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "src/data/**",
      "data/**",
      "src/components/ui/**",
      "src/routeTree.gen.ts",
      "dist/**",
    ],
  },
  lint: {
    ignorePatterns: ["src/components/ui/**", "src/routeTree.gen.ts", "dist/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
