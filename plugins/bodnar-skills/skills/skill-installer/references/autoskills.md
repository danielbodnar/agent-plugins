# `npx autoskills@latest` reference

Stack-aware bulk installer. Scans the project root, fingerprints the technologies in use, and installs the best curated skills for each.

## Source

GitHub: [midudev/autoskills](https://github.com/midudev/autoskills)
Site: [autoskills.sh](https://www.autoskills.sh/)
License: CC BY-NC 4.0 (non-commercial, worth noting before adopting at a company)

## Usage

```sh
npx autoskills [options]
```

That is the whole interface. Run it from the project root.

## Flags

| Flag | Effect |
|------|--------|
| `-y`, `--yes` | Skip the interactive confirmation prompt |
| `--dry-run` | Show what would be installed without writing anything |
| `-v`, `--verbose` | Show error details on failure |
| `-a`, `--agent <agent>` | Install for specific agents only (e.g. `claude-code`, `cursor`) |
| `-h`, `--help` | Show help |

The `--agent` flag can be repeated to target multiple agents in one run.

## What the run does

1. Scans `package.json`, lockfiles, Gradle files, `pyproject.toml`, `requirements.txt`, and other config files
2. Detects the language, runtime, framework, ORM, test runner, deploy target, and any combos (e.g. Next.js + Supabase)
3. Looks up matching skills in the curated autoskills registry
4. Shows an interactive selector with the matches
5. Downloads only the selected skill files, verifies each against the SHA-256 hashes recorded in the registry manifest
6. Writes them to `.claude/skills/` (or the equivalent for the targeted agent)
7. Records source and bundle hash in `skills-lock.json` at the project root
8. If `claude-code` is in the target list, regenerates `CLAUDE.md` summarizing the installed skills

The "verify before writing" step is the security headline. autoskills does not download from arbitrary upstream sources at runtime. The maintainers sync skills into the registry, scan them for prompt injection and supply-chain risk, and lock the bundle hash. The CLI then only writes files that match those recorded hashes.

## Detected technologies

The detection is breadth-first across modern stacks. As of early 2026:

- **Frameworks and UI**: React, Next.js, Vue, Nuxt, Svelte, SvelteKit, Angular, Astro, Tailwind CSS, shadcn/ui, GSAP, Three.js
- **Languages and runtimes**: TypeScript, Node.js, Bun, Deno, Go, Dart, Python, Java, Kotlin
- **Mobile**: Expo, React Native, Flutter, Android (Kotlin), iOS
- **Backend**: NestJS, Hono, Spring Boot, Fastify, Express
- **Databases and ORMs**: Prisma, Drizzle, Supabase, PostgreSQL, MongoDB
- **Cloud and deploy**: Cloudflare, Vercel, AWS, Netlify
- **Testing**: Playwright, Vitest, Jest
- **Payments**: Stripe
- **Desktop**: Tauri, Electron
- **CMS**: WordPress
- **Misc**: Auth, i18n, monorepo tooling, CI/CD signals

When a framework is not detected, autoskills falls back to file-tree scanning for web frontend signals (`.html`, `.css`, `.scss`, `.vue`, `.svelte`, `.jsx`, `.tsx`, `.twig`, `.blade.php`) and installs frontend design, accessibility, and SEO skills generically.

## Combo detection

Some skills target combinations rather than a single technology. autoskills detects combos and adds specialized skills for the combination. Example: Next.js + Supabase installs a "Supabase Postgres best practices for Next.js" skill on top of the individual Next.js and Supabase skills.

## CLAUDE.md regeneration

When `claude-code` is in the agent list, autoskills writes a fresh `CLAUDE.md` at the project root that summarizes the installed skills. This **overwrites** any existing CLAUDE.md. If the project already has a hand-written CLAUDE.md, save a copy first or run `--dry-run` to confirm nothing important is at risk.

```sh
cp CLAUDE.md CLAUDE.md.backup 2>/dev/null
npx autoskills --dry-run
# review, then
npx autoskills -y
```

## skills-lock.json

After install, the project root has a `skills-lock.json` that records each installed skill with its source and bundle SHA-256 hash. Treat this like a package lockfile: commit it, and rerunning autoskills against it produces a reproducible install.

## Examples

Preview without installing:

```sh
npx autoskills --dry-run
```

Install everything detected, claude-code only, no prompts:

```sh
npx autoskills -a claude-code -y
```

Install for both Claude Code and Cursor:

```sh
npx autoskills -a claude-code -a cursor
```

Verbose run for debugging:

```sh
npx autoskills -v --dry-run
```

## When to reach for this vs `skills`

`autoskills` is right when the project has a real `package.json` and the user wants a sensible default set of skills installed without picking each one. `skills add` is right when the user already knows the specific skill they want, or when the project does not have detectable signals (a fresh empty repo, or a non-standard stack autoskills does not cover).

The two compose well. Run `autoskills` first to bootstrap, then `skills add` to add anything autoskills missed.
