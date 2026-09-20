import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "esnext",
  platform: "node",
  outDir: "dist",
  clean: true,
  bundle: true,
  splitting: false,
  sourcemap: true,
  // add banner to shim require() for CJS dependencies is ESM context
  banner: {
    js: ` import { createRequire } from 'module'; const require = createRequire(import.meta.url); `,
  },
});
