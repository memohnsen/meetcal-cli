import { defineConfig } from "@bunli/core";

export default defineConfig({
  name: "meetcal",
  version: "0.1.0",
  description: "A CLI using data from the MeetCal app to access all meet and athlete info from USAW and USAMW meets",

  commands: {
    directory: "./src/commands",
  },

  build: {
    entry: "./src/index.ts",
    outdir: "./dist",
    targets: ["native"],
    minify: true,
    sourcemap: true,
    compress: false,
  },

  dev: {
    watch: true,
    inspect: true,
  },

  test: {
    pattern: ["**/*.test.ts", "**/*.spec.ts"],
    coverage: true,
    watch: false,
  },

  plugins: [],
});
