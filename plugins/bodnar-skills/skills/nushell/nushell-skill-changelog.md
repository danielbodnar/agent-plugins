# Nushell Skill Updates - Changelog

**Date:** April 17, 2026
**Version:** 3.0.0
**Target:** Nushell v0.112.2+

## Purpose

Update skill to target Nushell v0.112.2 (latest stable, released 2026-04-15). Incorporate changes from v0.111.0 and v0.112.1, document removed commands, and add new idioms.

## Changes

### Modified Files

#### `SKILL.md`

**Updated:**
- Version target bumped from v0.110.0+ to v0.112.2+
- Description updated to mention new v0.111 and v0.112 features
- Version Compatibility section rewritten with breaking changes by version
- Pre-Generation Checklist expanded

**Added:**
- "Let Mid-Pipeline (v0.111+)" section with pass-through examples
- "Error Handling with try..catch..finally (v0.111+)" section
- "Explicitly Calling Built-ins with `%` (v0.112.1+)" section
- "Aliasing Parent Commands (v0.111+)" section
- "Removed Commands (v0.112.1)" migration table
- "New Features Quick Reference" table covering v0.111 through v0.112.1
- Eight new gotchas: `it` reserved, `$nu/$env/$in` reserved, `open *.md` returns AST, `pipefail` default, `%` sigil usage, alias parent behavior

#### `references/deprecated-and-errors.md`

**Rewritten** with:
- New "Removed Commands (Hard Errors)" section covering v0.112.1 removals: `random dice`, `metadata set --merge`, `watch --debounce-ms`, `into value --columns/--prefer-filesizes`, `job tag`
- New "Reserved Names" section: `it`, `$nu`, `$env`, `$in`
- Additional deprecation entries: `metadata set --datasource-ls`, `ShellError::GenericError`
- New syntax errors: `open *.md` AST behavior, `pipefail` default failures
- Updated error message lookup table with new v0.112 errors
- Expanded version history table

#### `references/programming-guide.md`

**Added:**
- `try..catch..finally` subsection with closure argument patterns
- "Mid-Pipeline Assignment (v0.111+)" section
- "Deleting Variables with unlet (v0.110+)" section

#### `references/quick-reference.md`

**Added:**
- New top-level "New in v0.111 / v0.112" section covering:
  - Mid-pipeline `let`
  - `try..catch..finally`
  - `%` sigil
  - Aliasing parent commands
  - `from md` / markdown parsing
  - New commands (`str escape-regex`, `into duration` hh:mm:ss, `url parse --base`, `to nuon --list-of-records`, `group-by --prune`)
  - New config options
  - Experimental options table

## Impact

**Files changed:** 4 modified (SKILL.md, references/deprecated-and-errors.md, references/programming-guide.md, references/quick-reference.md)
**Breaking-change awareness added:** 11 breaking changes across v0.108 through v0.112.1
**New idioms documented:** 7 (let mid-pipeline, finally, % sigil, alias parents, from md, new commands batch, config options batch)

## Key Improvements

### Before v3.0.0

- Targeted v0.110.0+
- No coverage of `try..catch..finally`
- No coverage of mid-pipeline `let`
- No coverage of `%` sigil
- Did not warn about `open *.md` AST return
- Did not warn about `pipefail` default
- Listed commands that were later removed (`random dice`, `metadata set --merge`, `watch --debounce-ms`, `into value` inference)

### After v3.0.0

- Targets v0.112.2+
- Full coverage of v0.111 and v0.112.1 features
- Clear migration guidance for removed commands
- Updated error message lookup table
- Gotchas cover all v0.111/v0.112.1 reserved names and behavior shifts
- Quick-reference surfaces new syntax without deep-reading

---

**Date:** February 13, 2026
**Version:** 2.0.0
**Target:** Nushell v0.110.0+

## 🎯 Purpose

Update skill to target Nushell v0.110.0 (latest stable), add comprehensive tooling support for nu-lint, nu --lsp, and nu --mcp.

## 📝 Changes

### Modified Files

#### `SKILL.md`

**Updated:**
- ✅ Version target bumped from v0.108.0+ to v0.110.0+
- ✅ Description updated to mention nu-lint, LSP, and MCP
- ✅ Fixed duplicate quick-reference entry in references list
- ✅ Breaking changes section expanded with v0.109 and v0.110 changes

**Added:**
- ✅ Pipeline assignment pattern (`ls | get name | let files`)
- ✅ `unlet` command for variable destruction
- ✅ `error make` with `src` and `labels` (v0.110.0+)
- ✅ `into value` → `detect type` deprecation (v0.108.0)
- ✅ Full **Tooling** section with nu-lint, nu --lsp, nu --mcp
- ✅ nu-lint configuration (.nu-lint.toml), key rules, editor integration
- ✅ LSP editor configs (Zed, Neovim, VS Code, Emacs)
- ✅ MCP server configuration for Claude Code/Desktop
- ✅ New reference link: `references/tooling.md`
- ✅ Glob dotfile behavior gotcha (v0.110.0)
- ✅ Renamed `$nu.temp-path` / `$nu.home-path` gotcha
- ✅ `timeit --output` performance tip
- ✅ Linting & Validation best practice section

### New Files

#### `references/tooling.md`

Complete tooling reference covering:
- Validation hierarchy (nu-check → nu-lint → LSP)
- nu-check usage and limitations
- nu-lint installation, CLI usage, configuration, key rules
- nu --lsp capabilities and editor configurations
- nu --mcp setup for Claude Code, Claude Desktop, third-party MCP servers
- IDE integration for Zed, Neovim, VS Code, Emacs, Kate, Helix
- CI/CD with GitHub Actions (hustcer/setup-nu)
- Validation scripts
- Pre-commit hooks
- Debugging techniques (inspect, describe, timeit, scope variables, unlet)

---

**Date:** October 20, 2025  
**Version:** 1.1.0  
**Target:** Nushell v0.108.0+

## 🎯 Purpose

Prevent generation of code with deprecated syntax and common errors based on real-world issues encountered.

## 📝 Changes

### Modified Files

#### `/mnt/skills/user/nushell/SKILL.md`

**Added:**
- ✅ Deprecated Commands section (filter → where)
- ✅ Common Syntax Errors section (boolean switches, multi-line expressions)
- ✅ Validation and Testing section (checklist, nu-check, version checking)
- ✅ Enhanced Version section (breaking changes by version)

**Updated:**
- Line 18: "each, where, reduce" (removed "filter")
- References list: Added deprecated-and-errors.md as #1
- Script templates: Added test-syntax-patterns.nu

### New Files

#### `/mnt/skills/user/nushell/references/deprecated-and-errors.md`

**Contents:**
- Deprecated commands guide
- Common syntax errors with solutions
- Migration patterns
- Error message lookup table
- Validation checklist
- Version history

**Size:** ~450 lines

#### `/mnt/skills/user/nushell/scripts/test-syntax-patterns.nu`

**Contents:**
- 7 test cases for correct syntax patterns
- Executable validation suite
- ✅/❌ examples in comments
- Uses std/assert for verification

**Size:** ~200 lines

## 🔧 Fixed Issues

1. **Deprecated `filter` command**
   - Now explicitly warns against use
   - Shows `where` replacement
   - Includes migration guide

2. **Boolean switch type annotations**
   - Documents parser error
   - Shows correct syntax
   - Provides examples

3. **Multi-line boolean expressions**
   - Explains incomplete expression error
   - Shows proper parentheses usage
   - Demonstrates operator placement

## ✅ Validation

- [x] All new files syntax checked with `nu-check`
- [x] Test suite runs successfully
- [x] Applied to real-world code (gh-export-awesome)
- [x] Follows skill-creator guidelines
- [x] Progressive disclosure maintained
- [x] Under 500 lines in main SKILL.md

## 📊 Impact

**Lines Added:**
- SKILL.md: ~100 lines (net)
- deprecated-and-errors.md: ~450 lines (new)
- test-syntax-patterns.nu: ~200 lines (new)
- **Total:** ~750 lines

**Files Changed:** 1 modified, 2 created

## 🎓 Key Improvements

### Before
- ❌ Could generate code with `filter` command
- ❌ Could generate boolean switches with type annotations
- ❌ Could generate incomplete boolean expressions
- ❌ No validation guidance
- ❌ No error prevention

### After
- ✅ Explicit warnings against `filter`
- ✅ Clear syntax rules for boolean switches
- ✅ Proper multi-line expression patterns
- ✅ Validation checklist and workflow
- ✅ Comprehensive error prevention

## 🚀 Usage

### For Code Generation
```bash
# 1. Read reference when uncertain
cat references/deprecated-and-errors.md

# 2. Generate code following patterns

# 3. Validate before delivery
nu -c 'nu-check your-script.nu'

# 4. Run test suite for verification
nu scripts/test-syntax-patterns.nu
```

### Quick Reference
- **Deprecated:** `filter` → Use `where`
- **Boolean switches:** No `: bool` or `= false`
- **Multi-line booleans:** Wrap in `()`, operators at line start
- **Closures:** Always use `{|param| body }`
- **Strings:** Always use `($var)` in interpolation

## 📋 Checklist for Generated Code

Before delivery, verify:
- [ ] No `filter` commands
- [ ] Boolean switches plain (no type annotations)
- [ ] Multi-line booleans properly wrapped
- [ ] All closures have explicit parameters
- [ ] String interpolation uses parentheses
- [ ] Runs `nu-check` without errors
- [ ] Tested in target Nushell version

## 🔗 Files

All changes in:
- `/mnt/skills/user/nushell/SKILL.md`
- `/mnt/skills/user/nushell/references/deprecated-and-errors.md`
- `/mnt/skills/user/nushell/scripts/test-syntax-patterns.nu`

Summary document:
- `/mnt/user-data/outputs/nushell-skill-update-summary.md`

## 📚 See Also

- [skill-creator guidelines](../../examples/skill-creator/SKILL.md)
- [Nushell official docs](https://www.nushell.sh)
- [Nushell command reference](https://www.nushell.sh/commands/)

---

**Result:** Nushell skill now prevents all syntax errors encountered in gh-export-awesome and provides comprehensive guidance for correct code generation.
