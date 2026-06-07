# Attribution — recovering file ownership from a target's package database

`attribute.sh` answers one question for every file in the inventory: *which
native package put this here?* It does so by reading the target's own package
database **directly from the database files**, not by running the target's
package manager. This means the analyst's machine (normally Arch) can attribute
a Debian, Alpine, Fedora, or Arch rootfs offline, with no chroot and no foreign
tooling — except rpm, noted below.

A file the database does not claim is `UNMANAGED`: hand-placed binaries, edited
configs, `/opt` apps, generated state. Those become synthetic packages in
Phase 4.

## Distro detection

1. Read `<root>/etc/os-release`, then `<root>/usr/lib/os-release`; take `ID=`
   (and `ID_LIKE=` as a hint). `ID=` is the stable, ASCII, lowercase slug used
   for the `--os-name` default and synthetic-package naming. Do **not** use
   `PRETTY_NAME=` or the v260+ `FANCY_NAME=` field for any identifier:
   `FANCY_NAME=` may contain ANSI sequences and non-ASCII Unicode glyphs, and
   would corrupt both pkgnames and the TSV pipeline.
2. Confirm by which database tree exists — this is decisive, since `os-release`
   can lie on a re-spun image:

| Database path (under `<root>`) | Source distro family | Tool family |
|--------------------------------|----------------------|-------------|
| `var/lib/pacman/local/` | Arch / Arch-derivatives | pacman / ALPM |
| `var/lib/dpkg/` | Debian / Ubuntu / derivatives | dpkg / apt |
| `var/lib/rpm/` | Fedora / RHEL / openSUSE / derivatives | rpm / dnf |
| `lib/apk/db/` | Alpine | apk |

If none exist, the target has no package management — every file is
`UNMANAGED`, and the whole OS is reconstructed as synthetic packages.

---

## pacman / ALPM

The local database is one directory per installed package:

```
<root>/var/lib/pacman/local/<pkgname>-<pkgver>-<pkgrel>/
├── desc      # metadata: %NAME% %VERSION% %DEPENDS% %LICENSE% %BACKUP% ...
├── files     # %FILES% section: payload paths; %BACKUP% section: config+hash
└── mtree     # gzipped mtree of the package's files
```

**`files`** — after a `%FILES%` header line, each line is a payload path
**without leading slash**; directory entries end with `/`. Prepend `/` and drop
trailing-slash directory rows (directories are implied).

**`desc`** — INI-ish: a `%KEY%` header line followed by value lines until a
blank line. Useful keys: `%NAME%`, `%VERSION%`, `%DESC%`, `%URL%`, `%LICENSE%`,
`%ARCH%`, `%DEPENDS%`, `%OPTDEPENDS%`, `%PROVIDES%`, `%CONFLICTS%`,
`%REPLACES%`, `%GROUPS%`.

**`%BACKUP%`** (in `files`) — `path<TAB>hash` lines; the paths are the config
files for `backup=()`.

Reading these directly recovers near-complete metadata, so an Arch-source
repackage can copy `depends`, `license`, `pkgdesc`, and `backup` verbatim.

## dpkg

```
<root>/var/lib/dpkg/
├── status                         # all package metadata, RFC822-style stanzas
└── info/
    ├── <pkg>.list                 # one absolute path per line (payload)
    ├── <pkg>:<arch>.list          # multiarch packages carry an arch suffix
    ├── <pkg>.conffiles            # config files -> backup=() candidates
    ├── <pkg>.md5sums              # path -> md5 (payload, no leading slash)
    └── <pkg>.{pre,post}inst …     # maintainer scripts
```

**`<pkg>.list`** — absolute paths, one per line, including directories. The
package name is the filename minus `.list`; strip any `:<arch>` suffix.

**`<pkg>.conffiles`** — absolute config paths; map to `backup=()` (strip the
leading slash for the Arch field).

**`status`** — stanzas separated by blank lines; `Package:`, `Version:`,
`Architecture:`, `Depends:`, `Description:`, `Homepage:`, `Section:`. `Depends:`
is comma-separated with `pkg (>= ver)` and `|` alternatives — translate
conservatively (drop alternatives or pick the first).

Note Debian's package granularity differs from Arch's: Debian splits `-dev`,
`-doc`, `-dbg`, `-common`, runtime libs (`libfoo1`) etc. When repackaging, you
will often **merge** several Debian packages into one Arch leaf (handled in the
manifest, with `notes`), or keep the split using a split-package PKGBUILD.

## rpm

The rpmdb is a binary store (sqlite in modern Fedora; BerkeleyDB on older
systems) under `<root>/var/lib/rpm/`. It cannot be parsed with `awk`.
`attribute.sh` therefore shells out:

```
rpm --dbpath <root>/var/lib/rpm -qa --qf '%{NAME}\n'                 # package list
rpm --dbpath <root>/var/lib/rpm -ql <pkg>                            # files
rpm --dbpath <root>/var/lib/rpm -q --qf '...' <pkg>                  # metadata
rpm --dbpath <root>/var/lib/rpm -qc <pkg>                            # config files
```

If `rpm` is not installed on the analyst machine, `attribute.sh` cannot read the
database: it marks the rpm-owned content `UNMANAGED` and warns. Install `rpm`
(it is in Arch `extra`) to attribute a Fedora/RHEL target properly. A version
mismatch between the analyst's `rpm` and the target's rpmdb format can also
fail; if so, run `attribute.sh` from within the target via chroot/nspawn.

Config files from `rpm -qc` map to `backup=()`.

## apk (Alpine)

A single flat text database — easy to parse:

```
<root>/lib/apk/db/installed
```

Records are separated by blank lines. Within a record, one `KEY:value` per
line. Relevant keys:

- `P:` — package name
- `V:` — version
- `A:` — architecture
- `T:` — description
- `U:` — url
- `L:` — license
- `D:` — dependencies (space-separated; may carry `so:` / `pc:` / `cmd:`
  virtual prefixes and version constraints)
- `F:` — sets the **current directory** for following file entries (no leading
  slash)
- `R:` — a regular file in the current `F:` directory
- `M:` — directory metadata; `a:` — file metadata (perms/owner)

Reconstruct each absolute path as `/<F-value>/<R-value>`. apk records every file
explicitly, so attribution is exact.

---

## Output contract

`attribute.sh` emits TSV, one row per inventory file, sorted by path:

```
/usr/bin/ssh        openssh-server      debian
/usr/sbin/sshd      openssh-server      debian
/etc/ssh/sshd_config        openssh-server  debian   conffile
/opt/vendor/app/run UNMANAGED           debian
```

Columns: `path`, `owner` (native package name or `UNMANAGED`), `distro`, and an
optional 4th tag (`conffile`) marking config files for `backup=()`.

## Quality signal

After attribution, report the **managed ratio**: `managed / total`.

- A stock general-purpose distro: typically **> 95%** managed. A low ratio there
  means the inventory or DB path is wrong — investigate before planning.
- A hand-built appliance or heavily customized host: legitimately low. That
  simply means Phase 4 produces more synthetic `…-local-*` packages; cluster
  them thoughtfully.

Also list the **largest unmanaged subtrees** — they are the synthetic packages
that need the most deliberate naming and description.
