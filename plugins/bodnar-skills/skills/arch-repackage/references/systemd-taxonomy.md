# systemd v260 file taxonomy for packaging

When the target relies on systemd, the files it places carry packaging
implications: which go in `backup=()`, which trigger pacman hooks, which must
never be packaged at all. This maps systemd v260 file classes to those
decisions.

> Version note. This reference tracks systemd v260 (released 2026-03-17;
> v260.1 on 2026-03-23). The file taxonomy below is stable across the v258 to
> v260 range; the deltas that matter for repackaging are called out inline.
> v260 is a rolling-distro target (Arch, Fedora); enterprise and LTS targets
> will still be on v255 to v258 for some time, so the script logic does not
> assume any single version.

## The one rule that prevents the most mistakes

On a real Arch system, the cross-cutting post-install actions are performed by
**pacman hooks shipped in the `systemd` package**, under
`/usr/share/libalpm/hooks/`. These cover, at minimum:

- `systemctl daemon-reload` after unit files change
- `systemd-sysusers` after `sysusers.d` files change
- `systemd-tmpfiles --create` after `tmpfiles.d` files change
- `udevadm` rule reload after `udev/rules.d` changes
- `journalctl --update-catalog`, `systemd-hwdb update`, binfmt/sysctl reloads,
  `bootctl update`, etc.

**Therefore: if the reconstructed package set contains a genuine `systemd`
package, do NOT write `.install` scriptlets that repeat these actions.** The
hooks fire for *any* package whose payload touches the watched paths, including
your repackaged leaves. Duplicating them is redundant and can double-run during
upgrades.

Emit an `.install` scriptlet (or, better, ship a package-specific
`usr/share/libalpm/hooks/*.hook`) only for actions no system hook covers — e.g.
a one-time data migration, generating a host key, seeding a database.

Enabling a unit is **not** a scriptlet action either: units are enabled by
**preset policy**. Ship `*.preset` files (see below); the actual enable is a
build-time/policy decision (`systemctl preset-all`), not a package enabling
itself.

If the target is being reconstructed *without* a systemd package (rare — a
non-systemd appliance), then you must script these actions yourself; note that
explicitly in the manifest.

## File classes

Paths are relative to the target root. "→" gives the packaging action.

### Unit files

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/systemd/system/*.{service,socket,target,timer,path,mount,automount,swap,slice,scope,device}` | Vendor units | Normal payload of the owning leaf. daemon-reload via hook. |
| `usr/lib/systemd/user/*` | Vendor user units | Normal payload. |
| `etc/systemd/system/**` | Admin units, drop-ins, `*.wants/` symlinks | **Site configuration.** Usually `UNMANAGED` → a `…-local-units` synthetic package. Enable-symlinks (`*.wants/`, `*.requires/`) encode *enablement state* — capture them if reproducing the exact OS, but prefer regenerating them from presets. |
| `etc/systemd/*.conf`, `etc/systemd/*.conf.d/*.conf` | Manager/daemon config (`system.conf`, `journald.conf`, `logind.conf`, `networkd.conf`, `resolved.conf`, `timesyncd.conf`, `oomd.conf`, `homed.conf`, `coredump.conf`, `sleep.conf`, `pstore.conf`) | If vendor-shipped under `usr/lib`, normal payload + `backup=()`. If under `etc`, `backup=()` candidate. |

### Declarative directories (hook-triggered)

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/sysusers.d/*.conf`, `etc/sysusers.d/*.conf` | System user/group decls | Normal payload. `systemd-sysusers` runs via hook. Do not also `useradd` in a scriptlet. |
| `usr/lib/tmpfiles.d/*.conf`, `etc/tmpfiles.d/*.conf` | Volatile/temp file decls | Normal payload. `systemd-tmpfiles --create` via hook. |
| `usr/lib/sysctl.d/*.conf`, `etc/sysctl.d/*.conf` | Kernel params | Normal payload; sysctl reload via hook. |
| `usr/lib/modules-load.d/*.conf`, `etc/modules-load.d/*.conf` | Modules to load at boot | Normal payload. |
| `usr/lib/binfmt.d/*.conf`, `etc/binfmt.d/*.conf` | Binary format registration | Normal payload; binfmt reload via hook. |
| `usr/lib/environment.d/*.conf`, `etc/environment.d/*.conf` | User service environment | Normal payload. |
| `usr/lib/systemd/system-preset/*.preset`, `etc/systemd/system-preset/*.preset` | Enable/disable **policy** | Ship these to express default enablement instead of scriptlet `systemctl enable`. |
| `usr/lib/udev/rules.d/*.rules`, `etc/udev/rules.d/*.rules` | udev rules | Normal payload; udev reload via hook. `etc/...` rules are usually site config → `backup=()`/synthetic. |
| `usr/lib/udev/hwdb.d/*.hwdb` | Hardware database fragments | Normal payload; `systemd-hwdb` via hook. |

### Extensions and images (DDI ecosystem)

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/extension-release.d/extension-release.*` | sysext/confext image identity (`ID`, `VERSION_ID`, `SYSEXT_LEVEL`/`CONFEXT_LEVEL`, `ARCHITECTURE`) | Belongs **inside** an extension image, not loose on the host root. If found loose, it indicates an unpacked extension — package the extension as a unit, not the loose file. |
| `usr/lib/sysext/*.raw`, `var/lib/extensions/*.raw`, `etc/extensions/*.raw` | System extension images | Treat each `.raw` as opaque payload of one leaf. Mark `noextract`-equivalent intent: do **not** unpack a DDI into the package; ship the image whole. |
| `usr/lib/confext/*.raw`, `var/lib/confext/*` | Configuration extension images | As above. |
| `etc/extensions/` , `run/extensions/` | Extension activation dir | `run/` is transient — never package. `etc/extensions/` activation is site state. |
| Discoverable Disk Images (`*.raw`, `*.img` with GPT) | DDI | Opaque payload; never extract. `systemd-dissect` inspects, the package ships the image as-is. |

### Mount stacks (`.mstack/`, systemd v260+)

v260 added the **mstack** mechanism: a directory whose name ends in
`.mstack/` describes an OverlayFS-plus-bind-mount composition, mountable via
`systemd-mstack`, `mount -t mstack`, `RootMStack=` in units, or
`systemd-nspawn --mstack=`. An `.mstack/` directory is a *composition
descriptor*, and its internals have sharply different packaging meanings — do
**not** treat the directory as one undifferentiated blob.

| Path pattern (inside `<name>.mstack/`) | Class | Packaging action |
|--------------|-------|------------------|
| `<name>.mstack/layer@NN/**` | Read-only OverlayFS layers; the numeric suffix orders them (low to high = bottom to top) | Real vendor content. Package each layer's files as normal payload of the owning leaf. Preserve the `layer@NN` directory name verbatim — the suffix is load-bearing, not cosmetic. |
| `<name>.mstack/rw/`, `rw/data/**`, `rw/work/**` | Writable upper layer + overlayfs work dir | **Runtime state, never package as content.** `rw/data/` is whatever the running stack wrote; `rw/work/` is overlayfs scratch. Ship at most an empty `rw/` (mode preserved) so the stack is mountable; never bake a populated `rw/data/` into a package. |
| `<name>.mstack/**` symlinks pointing at `*.raw` / `.v/` versioned dirs | Layer references to DDIs/sysext images | The symlink is the descriptor; its target is a separate DDI handled by the rules above. Stage the **symlink itself** verbatim — never let `bsdtar` dereference it (the inventory already records symlink targets; do not follow them). Package the referenced `.raw` as its own opaque leaf. |
| A whole `<name>.mstack/` shipped by a package | Composition unit | Keep the directory intact in one leaf so the structure stays mountable. Split it across packages only if the layers genuinely come from different sources, in which case each `layer@NN/` may be its own leaf but the descriptor stays coherent. |

The skill's own monorepo convention (`.mstack/` composition directories) is
the authoring side of this same spec; when repackaging a target that already
ships `.mstack/` directories, the rules above apply to the *built* form.

### Portable services

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `var/lib/portables/*.raw`, `var/lib/portables/*/` | Portable service images | Opaque image payload of a leaf. Attaching/detaching (`portablectl`) is a deploy action, not packaging. |
| `usr/lib/systemd/portable/profile/**`, `etc/systemd/portable/profile/**` | Portable profiles (`strict`, `trusted`, `default`, custom) | Normal payload; `etc/...` profiles are site config. |
| `etc/portables/`, attach state | Attachment state | Runtime/site state, not vendor payload. |

### Containers / machines

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `etc/systemd/nspawn/*.nspawn` | Per-container nspawn config | Site config → synthetic package + `backup=()`. |
| `var/lib/machines/**` | Machine images / container roots | **Tenant/runtime data, not OS payload.** Exclude from inventory by default; package separately and deliberately if truly intended. |
| `usr/lib/systemd/system/systemd-nspawn@.service` etc. | Vendor template units | Part of the `systemd` leaf. |

### Networking (networkd)

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/systemd/network/*.{network,netdev,link}` | Vendor network config | Normal payload. |
| `etc/systemd/network/*.{network,netdev,link}` | Site network config (bridges, VLANs, VXLAN/Geneve, WireGuard, veth matches) | Site config → `…-local` synthetic package; `backup=()`. |

### Boot / firmware (handle with care)

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `boot/loader/loader.conf`, `boot/loader/entries/*.conf` | systemd-boot config / BLS entries | Boot config is **host-specific and risky**. Capture into a clearly-named synthetic package; never silently fold into a generic leaf. `backup=()`. |
| ESP contents (`boot/EFI/**`, kernels, UKIs, initrds) | Boot payload | Kernels/initrds/UKIs are normally produced by `kernel-install`/`mkinitcpio`/`ukify`, **not** shipped as static files. Prefer repackaging the kernel package and letting hooks regenerate; do not package a stale initrd as content. |
| `usr/lib/systemd/boot/efi/*.efi` | systemd-boot binaries | Part of the `systemd`/`systemd-boot` leaf. |

### Repart / partitioning

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/repart.d/*.conf`, `etc/repart.d/*.conf` | `systemd-repart` partition definitions | Normal payload; `etc/...` is site config → `backup=()`. |

### Generators

| Path pattern | Class | Packaging action |
|--------------|-------|------------------|
| `usr/lib/systemd/system-generators/*`, `usr/lib/systemd/user-generators/*` | Unit generators (executables) | Normal payload of the owning leaf; ensure the executable bit survives staging. |

> v260 removed SysV compatibility entirely: `systemd-sysv-generator`,
> `systemd-rc-local-generator`, `rc-local.service`, and `systemd-sysv-install`
> are gone. When repackaging a **v260+** target, `etc/init.d/*` scripts and
> `etc/rc.local` are dead weight — they have no runtime path. Treat them as
> ordinary unmanaged content (they land in `<os>-local-etc`) but flag them in
> `notes`: a service that still depends on them will not start. When
> repackaging an **older** target onto a v260 host, the same files are a
> migration hazard, not packageable behaviour. Either way, never synthesize a
> unit to revive them — that is a porting decision for the operator, not the
> packager.

## Never package (transient / generated)

These are runtime state — `inventory.sh` excludes them by default; keep them
excluded:

- `run/**` — tmpfs runtime state, including `run/systemd/**`.
- `var/lib/systemd/{catalog,random-seed,timers,linger}` and similar runtime
  state (`linger` may be reproduced deliberately, but as config, not blindly).
- `var/log/journal/**` — the journal. Never package logs.
- `var/lib/machines/**`, tenant data — runtime, not OS.
- `etc/machine-id` — **must be empty or absent in an image**; a baked-in
  machine-id is a correctness bug. Never package a populated `machine-id`.
- `proc`, `sys`, `dev`, `tmp`, `var/tmp`, `var/cache`.

## backup=() summary

Strong `backup=()` candidates: `etc/systemd/*.conf` and `*.conf.d` drop-ins,
`etc/systemd/network/*`, `etc/systemd/nspawn/*`, `etc/repart.d/*`,
`etc/udev/rules.d/*`, `etc/sysctl.d/*`, `etc/portables/*` — anything an operator
edits. Vendor files under `usr/lib` are *not* `backup` material; they are
replaced wholesale on upgrade.
