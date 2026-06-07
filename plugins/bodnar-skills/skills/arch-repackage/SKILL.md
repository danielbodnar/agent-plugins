---
name: arch-repackage
description: >-
  Reverse-engineer an existing Linux OS (running host, mounted rootfs, disk
  image, or container/OCI image) into a set of Arch Linux meta-packages plus
  regular packages, emitting spec-conformant PKGBUILD, .SRCINFO, .install, and
  payload files validated against pacman 7.1.0 and systemd v260. Use this skill
  whenever the user wants to repackage, re-derive, convert, decompose, or
  rebuild an existing operating system, appliance, or rootfs as Arch packages;
  extract PKGBUILDs from an installed system; turn a Debian/Ubuntu/Fedora/Alpine/
  Arch image into pacman packages; split a filesystem into leaf packages and
  layered meta-packages; or generate an Arch package set that reproduces another
  distro. Trigger even when the user only says "turn this OS into packages",
  "make PKGBUILDs from my system", "repackage this image for Arch", "extract
  packages from a rootfs", or describes building a package hierarchy out of a
  Linux install.
---

# Arch Repackage

Reverse-engineer an existing Linux operating system into a clean Arch Linux
package set: a tree of **meta-packages** (layered grouping units) sitting on top
of **regular packages** (the actual file-carrying leaves). The output is a
directory of build trees, each a spec-conformant `PKGBUILD` with its `.SRCINFO`,
optional `.install`, and (for binary repackages) a reproducible payload archive,
ready for `makepkg` and `repo-add`.

This is *decomposition*, not guessing. The skill never invents file ownership:
it reads the target's own package database, attributes every file to its origin,
and only synthesizes packages for what is genuinely unmanaged.

## Mental model

An installed OS is a flat filesystem that *used to be* a set of packages. Three
facts let you recover the package set:

1. **The target carries its own ALPM/dpkg/rpm/apk database.** Every file a
   native package manager installed is recorded. Read that database directly
   (no need to run on the target, no need for the target's distro) and you
   recover a near-perfect file-to-package map.
2. **Whatever is left is unmanaged** (hand-edited configs, dropped-in binaries,
   `/opt` apps, generated state). It must be *clustered by purpose* into
   synthetic packages, because no database will help you.
3. **Layers are meta-packages.** A meta-package is just a PKGBUILD with
   `depends=()` and no payload. The OS's logical layers (base, network,
   hypervisor, tenant runtime, ...) become a meta-package tree whose leaves are
   the regular packages from steps 1 and 2.

The whole job is a six-phase pipeline with one central artifact, the
**manifest** (`repackage-manifest.json`) — a typed intermediate representation
that every stage reads or writes. See `references/manifest-schema.md`.

## The pipeline

```
target ──▶ inventory.sh ──▶ attribute.sh ──▶ plan.sh ──▶ manifest ──▶ emit.sh ──▶ build trees ──▶ validate.sh
  (1)          (2)              (3)            (4)          IR          (5)                          (6)

build trees ──▶ tests/init.sh ──▶ bootstrap rootfs + pacman -U the whole set ──▶ nspawn / vmspawn / mstack
                    (7, optional integration test)
```

Stages are single-purpose and composable; each reads and writes plain files so
you can inspect, diff, and hand-edit between any two steps. The manifest is the
seam where automated decomposition stops and human/Claude judgment takes over —
`plan.sh` produces a *draft* skeleton; refining it is the real work.

All bundled scripts are POSIX-leaning `bash`. They run on the analyst's machine
(normally Arch), not inside the target. `bash`, `find`, `awk`, `bsdtar`
(`libarchive`), and `jq` are required; `makepkg`, `namcap`, and `pacman` are
used when present. Reasoning: PKGBUILD is itself bash and `makepkg` sources it,
so the toolchain stays inside the ecosystem it targets and needs nothing exotic
on a target rootfs.

---

## Phase 1 — Scope the target

Establish two things before touching anything:

**Target form.** One of:
- `host` — the running system (`/`). Inventory the live root.
- `rootfs` — an extracted/mounted root directory. Most common; everything keys
  off a `--root` prefix.
- `image` — a disk image or DDI. Mount it first, then treat as `rootfs`. For
  Discoverable Disk Images use `systemd-dissect --mount IMAGE MNT`; for plain
  partition images use a loop mount; for `.qcow2` use `qemu-nbd` or convert with
  `qemu-img convert -O raw`.
- `oci` — a container image. Flatten layers first
  (`skopeo copy docker://… oci-archive:…` then extract, or
  `podman export $(podman create IMG) | bsdtar -C MNT -xf -`), then treat as
  `rootfs`.

Always reduce to a single root directory. The scripts only understand a root.

**Source distro.** Read `<root>/etc/os-release` (fall back to
`<root>/usr/lib/os-release`) for `ID`/`ID_LIKE`, and confirm by which database
exists: `var/lib/pacman` (Arch), `var/lib/dpkg` (Debian/Ubuntu),
`var/lib/rpm` (Fedora/RHEL/SUSE), `lib/apk` (Alpine). `attribute.sh` auto-detects
this; you only need it for naming and to know whether `rpm` must be available.
A target with *no* recognizable database is valid — everything becomes unmanaged.

State the scoped form, root path, and detected distro back to the user before
proceeding. If the user asked to repackage "an image" but gave no path, ask for
the path or mountpoint; do not guess.

---

## Phase 2 — Inventory

```
scripts/inventory.sh --root <ROOT> [--exclude-extra GLOB] > inventory.tsv
```

Walks the root and emits one TSV row per filesystem object: relative path
(leading `/`), type (`f`/`d`/`l`), size, octal mode, and symlink target. By
default it skips pseudo and transient trees (`/proc`, `/sys`, `/dev`, `/run`,
`/tmp`, `/var/tmp`, `/var/cache`, `/var/log`, `/lost+found`, the pacman/dpkg
sync caches) because those are not packageable content — they are runtime
state. Add `--exclude-extra` for site-specific noise (build caches, tenant data,
mount points for other filesystems).

Sanity-check the row count and the largest files. A surprising inventory
(millions of rows, a 40 GB blob) usually means a runtime tree slipped the
exclude list — fix the excludes rather than packaging garbage.

---

## Phase 3 — Attribute

```
scripts/attribute.sh --root <ROOT> --inventory inventory.tsv > attribution.tsv
```

Reads the target's package database **directly from its files** and joins it
against the inventory, emitting `path  owner  distro` where `owner` is a native
package name or the literal `UNMANAGED`. Parsing the DB files directly (rather
than shelling out to the native tool) means an Arch host can attribute a Debian
or Alpine rootfs offline. Details and per-distro DB layout:
`references/attribution.md`.

- **pacman**: `var/lib/pacman/local/*/files` (`%FILES%` section).
- **dpkg**: `var/lib/dpkg/info/*.list`; `*.conffiles` flags config files.
- **apk**: `lib/apk/db/installed` (`P:`/`F:`/`R:` records).
- **rpm**: the rpmdb is a binary store — `attribute.sh` invokes
  `rpm --dbpath <root>/var/lib/rpm -qa`/`-ql`. If `rpm` is unavailable it marks
  the rpm-owned tree `UNMANAGED` and warns; install `rpm` to attribute properly.

Report the attribution ratio (managed vs `UNMANAGED`). A healthy general-purpose
distro is >95% managed; a hand-built appliance may be far lower, which simply
means more synthetic packages downstream.

---

## Phase 4 — Plan (build the manifest)

```
scripts/plan.sh --attribution attribution.tsv --inventory inventory.tsv \
  --os-name <SHORTNAME> > repackage-manifest.json
```

`plan.sh` emits a **draft** manifest, not a finished one:

- Each native package becomes one **leaf** entry, `strategy: "binary"`, carrying
  exactly its attributed files.
- `UNMANAGED` files are clustered coarsely by location into synthetic leaves
  (`<os>-local-etc`, `<os>-local-opt`, `<os>-local-usrlocal`, `<os>-local-srv`,
  `<os>-local-misc`, plus `<os>-local-units` for stray systemd units).
- A skeleton **meta-package tree** is created: a top-level `<os>-system` meta
  depending on layer metas (`<os>-base`, `<os>-extras`, `<os>-local`).

Then **refine the manifest by hand** — this is where the skill earns its keep,
and `plan.sh`'s clustering is deliberately crude so you do not trust it blindly:

1. **Design the real meta-package tree.** Group leaves into layers that reflect
   the system's *architecture*, not just file locations. For a multi-tenant
   hypervisor that might be `…-base`, `…-virt`, `…-net`, `…-portable-runtime`,
   `…-tenant-runtime`, `…-mgmt`. A meta-package depends on the leaves of its
   layer; higher metas depend on lower metas. See
   `references/manifest-schema.md` for the tree fields and
   `references/pkgbuild-spec.md` for why real meta-packages beat bare pacman
   `groups`.
2. **Split or merge synthetic leaves.** The `…-local-*` buckets are a starting
   point; break out anything coherent (a vendored app in `/opt`, a set of
   site units) into its own named package with a real `pkgdesc`.
3. **Choose a strategy per leaf.** `binary` reproduces the exact installed bytes
   (high fidelity — the right default for "reproduce this OS"). `source` writes
   a from-source PKGBUILD scaffold (maintainable, updatable, but you must supply
   upstream URL and build steps; it cannot be auto-derived). `virtual` is a
   payload-free package. Decision guidance: `references/pkgbuild-spec.md`.
4. **Wire dependencies.** Carry native `depends` where the DB provides them; for
   synthetic leaves add the obvious runtime deps. List first-level deps
   explicitly even if transitive (per Arch guidelines).
5. **Mark config and scriptlets.** Files under `/etc` that are dpkg-conffiles or
   otherwise editable go in `backup=()`. Flag any leaf needing an `.install`
   scriptlet — but first read the systemd section below; most "enable my
   service" reflexes are wrong on Arch.

The manifest is plain JSON: diff it, review it with the user, iterate.

---

## Phase 5 — Emit build trees

```
scripts/emit.sh --manifest repackage-manifest.json --root <ROOT> --out ./packages
```

For every manifest entry, `emit.sh` writes a build directory under `./packages/`:

- **meta / virtual** — a `PKGBUILD` with `arch=('any')`, `depends=(…)`, and a
  no-op `package()`; no source, no payload.
- **binary leaf** — stages the entry's files out of `<ROOT>` with attributes
  preserved (`bsdtar` copy: mode, owner, mtime, xattrs, capabilities), packs
  them into a reproducible `<pkgname>-<pkgver>.tar.zst` payload beside the
  PKGBUILD, records a `b2sums` checksum, and writes a `PKGBUILD` whose
  `package()` extracts the payload into `$pkgdir`. Generates `.install` when the
  manifest flags scriptlets.
- **source leaf** — writes a from-source `PKGBUILD` scaffold with `pkgver`,
  `url`, `license`, `depends`, and clearly-marked `TODO` `build()`/`package()`
  bodies for you to complete from upstream.

It then runs `makepkg --printsrcinfo` in each directory to produce `.SRCINFO`
(the authoritative generator — never hand-write `.SRCINFO`). If `makepkg` is
absent it skips this and warns; generate `.SRCINFO` later on an Arch machine.

`emit.sh` does **not** invent build logic for source leaves and does **not**
run `makepkg` to build packages — emitting trees and building are separate
concerns.

---

## Phase 6 — Validate & assemble

```
scripts/validate.sh --packages ./packages
```

For each build tree: `bash -n` on the PKGBUILD, `makepkg --printsrcinfo` parse
check, `.SRCINFO`↔PKGBUILD parity, `b2sums` presence for binary leaves, and
`namcap PKGBUILD` when available. It also checks the **dependency closure**: every
`depends`/meta edge resolves to another package in the set or is explicitly
marked external.

To build and assemble a local repository afterward (outside the skill's scope
but the natural next step):

```
for d in packages/*/;  do (cd "$d" && makepkg -df --skipinteg); done
repo-add packages/<os>.db.tar.zst packages/*/*.pkg.tar.zst
```

Then a machine can install the whole reconstructed OS with
`pacman -S <os>-system`.

---

## Phase 7 — Integration test (optional)

`validate.sh` is static analysis. To prove the emitted set actually installs
and runs, the skill ships an integration harness under `scripts/tests/`. It
does **not** test packages one by one; it builds the whole set and installs
it in a single transaction, then exercises the result.

```
scripts/tests/init.sh --target / --os-name myhost
```

`init.sh` is the entry point. It runs `bootstrap.sh`, which:

1. stands up a clean Arch rootfs via `pacstrap` (falling back to the official
   bootstrap tarball when pacstrap is absent),
2. runs the full inventory→attribute→plan→emit pipeline against `--target`
   (default `/`, the live host),
3. `makepkg`s every emitted PKGBUILD,
4. installs the **entire package set in one `pacman -U` transaction**, so the
   meta-package tree and its leaf dependency closure must resolve together.

`init.sh` then hands the populated rootfs to three runtime suites:

| Suite | What it asserts |
|-------|-----------------|
| `nspawn.sh`  | Boots the rootfs as a `systemd-nspawn` container; checks command execution, that the pacman DB carries the set, that a `*-system` meta-package is registered, and `pacman -Qkk` integrity. |
| `vmspawn.sh` | Boots the rootfs as an ephemeral KVM VM via `systemd-vmspawn`; waits for a reached systemd target; flags kernel panics as hard failures. |
| `mstack.sh`  | Composes a throwaway `.mstack/` over the rootfs and verifies overlay layer ordering and the writable `rw/` upper layer (v260); then fidelity-checks any `.mstack/` the reversed target itself shipped. |

Every step is **capability-probed**: missing `pacstrap`, `makepkg`, `root`,
`/dev/kvm`, `systemd-nspawn`, or `systemd-mstack` downgrades that step to a
clean `SKIP` (exit 0), never a hard failure. The harness therefore runs end to
end on a constrained CI runner and on a full Arch workstation alike, doing as
much as the host allows. `lib.sh` holds the shared probing, logging, and
pass/skip/fail accounting; all harness chatter is on stderr so a captured
phase's stdout stays clean.

Set `KEEP_WORK=1` to retain the per-run workspace (rootfs, build tree, logs)
for inspection.

---

## systemd-aware packaging

When the target leans on systemd (units, sysext/confext, portable services,
nspawn, networkd, repart, capsules) — read `references/systemd-taxonomy.md`
**before** writing any `.install` scriptlet. It maps every systemd file class
to its packaging implications.

The single most important rule, because it is the most common mistake:
**on a real Arch system, daemon-reload, sysusers, tmpfiles, udev reload, and
similar post-install actions are performed by pacman hooks shipped in the
`systemd` package** (`/usr/share/libalpm/hooks/`), not by per-package install
scriptlets. If your reconstructed set includes a proper `systemd` package, do
**not** duplicate those actions in `.install` files. Units are *enabled* by
preset policy (`*.preset` files), not by a package enabling itself. Emit an
explicit scriptlet only for genuinely package-specific actions no hook covers.

---

## Reference files

Read these as needed; do not load them all up front.

- `references/manifest-schema.md` — the `repackage-manifest.json` IR: every
  field, the meta-package tree shape, a worked example.
- `references/pkgbuild-spec.md` — condensed PKGBUILD(5)/makepkg/ALPM spec:
  fields, the `.SRCINFO`/`.PKGINFO`/`.BUILDINFO`/`.MTREE` package internals,
  meta-package construction, binary-vs-source strategy guidance.
- `references/attribution.md` — per-distro package-database layout and the
  exact offline parsing rules for pacman, dpkg, rpm, and apk.
- `references/systemd-taxonomy.md` — systemd v260 file taxonomy mapped to
  packaging actions, `backup=()` candidates, and the pacman-hooks-vs-scriptlets
  rule.

## Hard constraints

- **Never fabricate file ownership or `depends`.** If the database does not say
  it, the file is `UNMANAGED` and the dependency is unknown — represent it
  honestly rather than guessing.
- **`pkgver` must not contain `:`, `/`, `-`, or whitespace.** Sanitize versions
  harvested from other distros (Debian `1.2-3` → `pkgver=1.2 pkgrel=3`, or use
  `epoch` when the scheme is incomparable). See `references/pkgbuild-spec.md`.
- **Package names** may contain only `[A-Za-z0-9@._+-]` and may not start with
  `-` or `.`. Lowercase synthetic names.
- **`.SRCINFO` is generated, never authored** — always via
  `makepkg --printsrcinfo`.
- **Binary repackaging reproduces bytes, not provenance.** A binary-repackaged
  package's `license` and source URL describe the *original* software; record
  what is known and mark the rest `TODO` — do not imply a clean-room build.
- **Stay thin.** This skill orchestrates `makepkg`, `pacman`, `bsdtar`, and the
  native databases; it does not reimplement them. If a request needs behavior
  these tools do not have, surface that rather than building a parallel
  mechanism.
