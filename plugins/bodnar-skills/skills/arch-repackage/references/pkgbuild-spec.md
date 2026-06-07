# PKGBUILD & ALPM packaging spec (condensed)

Reference for emitting spec-conformant Arch packages. Authoritative sources:
`PKGBUILD(5)`, `makepkg(8)`, `makepkg.conf(5)`, and the ALPM format specs
(`SRCINFO(5)`, `PKGINFO(5)`, `BUILDINFO(5)`, `ALPM-MTREE(5)`) — current as of
pacman 7.1.0.

## Contents

1. PKGBUILD fields
2. Packaging functions and `makepkg` variables
3. The package file: `.PKGINFO` / `.BUILDINFO` / `.MTREE`
4. `.SRCINFO`
5. Install scriptlets
6. Meta-packages
7. Binary-repackage vs source-rebuild
8. Version sanitization
9. Reproducibility notes

---

## 1. PKGBUILD fields

A PKGBUILD is a bash script `makepkg` sources. Mandatory: `pkgname`, `pkgver`,
`pkgrel`, `arch`. `license` is not mandatory but `makepkg` warns without it.

| Field | Type | Notes |
|-------|------|-------|
| `pkgname` | string \| array | Name, or array for a split package. `[A-Za-z0-9@._+-]`, no leading `-`/`.`. |
| `pkgver` | string | Upstream version. **No `:`, `/`, `-`, or whitespace.** May be set by a `pkgver()` function. |
| `pkgrel` | int[.int] | Distro release. `1` for a new upstream release, bump for PKGBUILD-only changes. |
| `epoch` | int | Default `0`. Forces newer-than ordering when version schemes are incomparable. |
| `pkgdesc` | string | One line, ≤80 chars, do not restate the package name. |
| `url` | string | Upstream project URL. |
| `license` | array | SPDX identifiers, e.g. `('GPL-3.0-or-later' 'MIT')`. |
| `arch` | array | `('x86_64')`, `('aarch64')`, … or `('any')` for arch-independent content. |
| `groups` | array | Group labels (`base-devel`, etc.). Pure labels — not installable units. |
| `depends` | array | Runtime deps. `name`, `name>=ver`, `name=ver`, `name<ver`, `lib.so`. List first-level deps explicitly even if transitive. |
| `makedepends` | array | Build-only deps. |
| `checkdepends` | array | Deps for `check()` only. |
| `optdepends` | array | `'pkg: reason'`; informational, not resolved by pacman. |
| `provides` | array | Virtual provisions; versioned form `name=ver` (no `<`/`>`). |
| `conflicts` | array | Mutually-exclusive packages; versioned operators allowed. |
| `replaces` | array | Packages this one supersedes (used by `-Syu`). |
| `backup` | array | Config paths **without** leading slash, preserved on upgrade/remove. |
| `options` | array | makepkg behavior overrides: `strip`, `!strip`, `docs`, `!docs`, `libtool`, `staticlibs`, `emptydirs`, `zipman`, `ccache`, `distcc`, `buildflags`, `makeflags`, `debug`, `lto`. Prefix `!` to negate. |
| `install` | string | Name of the `.install` scriptlet file (same dir; not in `source`). |
| `changelog` | string | Name of a changelog file (same dir; not in `source`). |
| `source` | array | Files/URLs to fetch. `'name::url'` renames; `.sig`/`.asc`/`.sign` auto-verify. Per-arch: `source_x86_64=()`. |
| `noextract` | array | Source entries not to auto-extract. |
| `validpgpkeys` | array | Uppercase full fingerprints; restricts accepted signatures. |
| `b2sums` / `sha256sums` / `sha512sums` / `md5sums` / `cksums` | array | Integrity, one per `source` entry, same order. `SKIP` to skip one. Generate with `makepkg -g`. Prefer `b2sums`. |
| `xdata` | array | `key=value` informational metadata; `pkgtype` key is reserved. |

Per-architecture variants exist for `source`, `depends`, `makedepends`,
`checkdepends`, `optdepends`, `conflicts`, `provides`, `replaces`, `options`,
and the checksum arrays (suffix `_x86_64`, `_aarch64`, …).

Custom variables/functions must be prefixed `_` to avoid clashing with makepkg
internals (e.g. `_srctag`). Quote anything that may contain spaces — always
`"$pkgdir"`, `"$srcdir"`.

## 2. Packaging functions

Sourced and run by `makepkg`. Minimum is `package()`.

| Function | Runs in | Purpose |
|----------|---------|---------|
| `verify()` | `$startdir` | Optional. Arbitrary source authentication; non-zero = fail. Before extraction. |
| `prepare()` | `$srcdir` | Optional. Patch/prepare extracted sources. |
| `pkgver()` | `$srcdir` | Optional. Echo a computed version (VCS sources). |
| `build()` | `$srcdir` | Optional. Compile/adjust. |
| `check()` | `$srcdir` | Optional. Run the test suite (`checkdepends`). |
| `package()` | `$srcdir` | Required. Install files into `$pkgdir`. Runs under `fakeroot`. |

makepkg-provided variables: `$srcdir` (extracted/copied sources), `$pkgdir`
(staging root that becomes the package), `$startdir` (PKGBUILD dir; deprecated).
`$pkgname`, `$pkgver`, etc. are all available.

**Split packages**: set `pkgname=(a b c)`, optionally `pkgbase=`, and define
`package_a()`, `package_b()`, … Overridable per split: `pkgdesc`, `arch`, `url`,
`license`, `groups`, `depends`, `optdepends`, `provides`, `conflicts`,
`replaces`, `backup`, `options`, `install`, `changelog`. Global `depends`/
`makedepends` still hold all build-time requirements. Splitting is a good fit
when one native source produced several related leaves (e.g. Debian's
`openssh-server`/`openssh-client`/`openssh-sftp-server`).

## 3. The package file

A built package is a `zstd`-compressed tar named
`pkgname-pkgver-pkgrel-arch.pkg.tar.zst` containing the payload plus:

- **`.PKGINFO`** — package metadata pacman consumes (PKGINFOv2 since pacman
  6.1.0). Keyword=value lines: `pkgname`, `pkgbase`, `pkgver`, `pkgdesc`,
  `url`, `builddate`, `packager`, `size`, `arch`, `license*`, `depend*`,
  `optdepend*`, `provides*`, `conflict*`, `backup*`, and `xdata` (must include
  `pkgtype`). Generated by `makepkg` from the PKGBUILD — not authored.
- **`.BUILDINFO`** — the build environment for reproducible builds
  (BUILDINFOv2): format version, packager, builddate, builddir, build env,
  installed package list, options. Generated by `makepkg`.
- **`.MTREE`** — an `mtree(5)` subset (gzipped) recording every payload file's
  path, mode, owner, size, and digests; pacman uses it to verify integrity.
  Generated by `makepkg` via `bsdtar`.
- **`.INSTALL`** — present only if `install=` was set (the scriptlet, embedded).

You never hand-write `.PKGINFO`/`.BUILDINFO`/`.MTREE`/`.INSTALL`. They are
artifacts of `makepkg package()`. The skill produces PKGBUILD + payload +
`.install` + `.SRCINFO`; `makepkg` produces the rest at build time.

## 4. `.SRCINFO`

A textual, bash-free projection of the PKGBUILD's metadata, used by tooling
that must not execute a PKGBUILD. One `pkgbase` section followed by one or more
`pkgname` sections (each may override pkgbase fields). Section headers are
`key = value`; data lines are indented `key = value`; `#` comments and blank
lines ignored.

**Always generate it** — never author it:

```
makepkg --printsrcinfo > .SRCINFO
```

Keep `.SRCINFO` in sync with the PKGBUILD; `validate.sh` checks parity.

## 5. Install scriptlets

A `.install` file holds bash functions pacman runs around install/upgrade/
remove. Each receives one or two full version strings (`pkgver-pkgrel`, or
`epoch:pkgver-pkgrel`):

`pre_install` · `post_install` (1 arg: new ver) · `pre_upgrade` · `post_upgrade`
(2 args: new, old) · `pre_remove` · `post_remove` (1 arg: old ver).

During an upgrade only the `*_upgrade` pair runs (not install/remove).
`/usr/share/pacman/proto.install` is the upstream template.

**Crucial for systemd-heavy systems**: most post-install actions you might
reflexively script — `systemctl daemon-reload`, `systemd-sysusers`,
`systemd-tmpfiles --create`, `udevadm control --reload` — are handled globally
by **pacman hooks** shipped in the `systemd` package
(`/usr/share/libalpm/hooks/*.hook`). If the reconstructed set contains a real
`systemd` package, do not duplicate those in `.install`. See
`systemd-taxonomy.md`. Scriptlets are for genuinely package-specific work that
no hook performs.

Modern Arch packaging prefers **alpm hooks** over scriptlets for cross-cutting
actions; a leaf can ship its own `*.hook` under `usr/share/libalpm/hooks/`
instead of an `.install` when the action is declarative and file-triggered.

## 6. Meta-packages

A meta-package carries **no files**; it exists to pull in others via `depends`.
Construction:

```bash
pkgname=hyp-base
pkgver=1.0.0
pkgrel=1
pkgdesc="Base layer for the reconstructed hypervisor OS"
arch=('any')
url="https://example.internal/"
license=('0BSD')
depends=('filesystem' 'glibc' 'systemd' 'bash' 'coreutils' 'pacman')

package() {
  :   # intentionally empty — metadata-only package
}
```

Notes:
- `arch=('any')` — a meta-package is architecture-independent.
- Empty `package()` (`:` or `true`). makepkg's `emptydirs` default tolerates a
  bodyless package; the resulting `.pkg.tar.zst` carries only metadata.
- The dependency tree *is* the layering. A top meta depends on layer metas;
  layer metas depend on leaves and lower metas.

**Meta-packages vs `groups`.** A pacman *group* is only a label — `pacman -S
<group>` expands to its members at that instant, the group is not installed,
not tracked, not removable, and membership is whatever each package currently
declares. A *meta-package* is a real installed unit with its own dependency
closure: it can be queried (`pacman -Qi`), removed (taking orphans with
`-Rs`), versioned, and depended upon. Reconstructing an OS as an installable,
trackable hierarchy needs meta-packages. Use `groups` only as an additional
convenience label.

## 7. Binary-repackage vs source-rebuild

Per-leaf strategy choice (`manifest-schema.md` → `strategy`).

**`binary`** — package the installed bytes verbatim. `source` is a harvested
payload archive; `package()` extracts it into `$pkgdir`.
- Pros: exact reproduction of the target OS — same binaries, same data,
  bit-for-bit; no build toolchain; fast; works even when upstream is gone.
- Cons: not built from source, so it is a *reproduction*, not a clean package;
  `license`/source URL describe the original software, not a build you
  performed; debug symbols, `arch` correctness, and capabilities ride along
  as-is; you inherit whatever the original distro shipped.
- Default for "reverse-engineer / reproduce this exact OS".

**`source`** — a normal from-source PKGBUILD. `emit.sh` writes a scaffold with
metadata filled and `TODO` build/package bodies.
- Pros: maintainable, updatable, auditable, genuinely "yours"; correct
  provenance.
- Cons: you must identify upstream and write the build; the result may *drift*
  from the exact OS being reverse-engineered.
- Choose for packages you intend to maintain going forward, or where the target
  shipped something you want to rebuild cleanly.

**`virtual`** — no payload (metas, or pure dependency aggregators).

Mixed sets are normal: rebuild the handful of packages you will own from
source; binary-repackage the long tail.

## 8. Version sanitization

`pkgver` forbids `:`, `/`, `-`, whitespace. Versions harvested from other
distros routinely violate this:

| Foreign version | Arch mapping |
|-----------------|--------------|
| Debian `1.2.3-4` | `pkgver=1.2.3`, `pkgrel=4` |
| Debian `1:2.3-1` (epoch) | `epoch=1`, `pkgver=2.3`, `pkgrel=1` |
| Debian `1.2.3+dfsg1-2` | `pkgver=1.2.3+dfsg1` (`+` is allowed), `pkgrel=2` |
| RPM `1.2.3-4.fc40` | `pkgver=1.2.3`, `pkgrel=4` |
| `2024-05-01` (date) | `pkgver=2024.05.01` (replace `-` with `.`) |
| Git snapshot `r1234.abcdef` | `pkgver=r1234.abcdef` (`.` ok) |

When the foreign scheme cannot be made to order correctly against an existing
Arch package, bump `epoch`.

## 9. Reproducibility notes

For binary leaves, a reproducible payload archive matters so re-emitting yields
identical checksums:

- Pack with a fixed sort order and a clamped mtime
  (`bsdtar` + `LC_ALL=C`, or `--options` to normalize). `emit.sh` does this.
- Preserve mode, ownership, mtime, xattrs, and capabilities when staging
  (`bsdtar` copy mode), so `makepkg`'s `.MTREE` reflects the real target.
- Record `b2sums` (BLAKE2) — the preferred integrity algorithm.
- `makepkg` itself records `.BUILDINFO` for build-environment reproducibility;
  do not fight it.
