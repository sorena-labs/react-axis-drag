import { configDefaults, defineConfig } from "vitest/config";

// Checkouts of other branches can sit under .claude/worktrees; their tests are not this checkout's.
export default defineConfig({ test: { environment: "jsdom", exclude: [...configDefaults.exclude, ".claude/**"] } });
