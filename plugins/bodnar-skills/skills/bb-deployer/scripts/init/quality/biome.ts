// scripts/init/quality/biome.ts
//
// Installs Biome as the JS, TS, JSON, JSX, and TSX linter and formatter.
// Writes biome.json at the repo root with strict, opinionated defaults aligned
// to Daniel's writing style preferences (double quotes, semicolons, ES5 trailing
// commas, 100-column lines, two-space indent).
//
// Does not configure Biome for languages it does not handle natively.  Markdown,
// TOML, YAML, and other formats route through the dprint module instead.

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  addGitignoreEntries,
  defineModule,
  updatePackageJson,
  writeFile,
} from "../lib/module.ts";

const BIOME_CONFIG = `{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "es5",
      "arrowParentheses": "always"
    }
  },
  "json": {
    "formatter": {
      "trailingCommas": "none"
    }
  }
}
`;

export default defineModule({
  id: "quality/biome",
  category: "quality",
  description: "Linter and formatter for JS, TS, JSON, JSX, TSX",
  presets: ["full", "minimal"],

  async applies(ctx) {
    return ctx.force || !existsSync(join(ctx.cwd, "biome.json"));
  },

  async apply(ctx) {
    await writeFile("biome.json", BIOME_CONFIG, ctx);
    await updatePackageJson(
      {
        devDependencies: {
          "@biomejs/biome": "^2.0.0",
        },
        scripts: {
          lint: "biome check .",
          "lint:fix": "biome check --apply .",
          format: "biome format --write .",
          "format:check": "biome format .",
        },
      },
      ctx,
    );
    await addGitignoreEntries([".biome-cache"], ctx);
  },
});
