# Manifest schema — `repackage-manifest.json`

The manifest is the typed intermediate representation that connects every
pipeline stage. `plan.sh` writes a draft; you refine it; `emit.sh` consumes it.
It is plain JSON so it diffs cleanly and can be reviewed with the user.

## Top-level shape

```json
{
  "schema": "https://bitbuilder.cloud/schemas/repackage-manifest/v1.0.0",
  "target": {
    "form": "rootfs",
    "root": "/mnt/target",
    "distro": "debian",
    "os_release_id": "debian",
    "arch": "x86_64"
  },
  "defaults": {
    "pkgrel": 1,
    "packager": "Daniel Bodnar <daniel@bodnar.sh>",
    "strategy": "binary"
  },
  "packages": [ /* PackageEntry[] */ ],
  "tree": { /* MetaTree */ }
}
```

| Field | Meaning |
|-------|---------|
| `schema` | Schema identifier/version. Bump on breaking changes. |
| `target.form` | `host` \| `rootfs` \| `image` \| `oci`. Always reduced to a root. |
| `target.root` | Absolute path the analysis was run against. |
| `target.distro` | Detected source distro (`arch`, `debian`, `fedora`, `alpine`, `unknown`). |
| `target.arch` | ALPM architecture of the binary content (`x86_64`, `aarch64`, ...). Drives `arch=()` for binary leaves. |
| `defaults` | Values inherited by entries that omit them. |
| `packages` | Flat array of every package — leaves and metas alike. |
| `tree` | The meta-package dependency tree (see below). |

## PackageEntry

One object per Arch package to be produced.

```json
{
  "pkgname": "openssh",
  "kind": "leaf",
  "strategy": "binary",
  "pkgver": "9.9p1",
  "pkgrel": 1,
  "epoch": 0,
  "pkgdesc": "Premier connectivity tool for remote login with the SSH protocol",
  "arch": ["x86_64"],
  "url": "https://www.openssh.com/",
  "license": ["BSD-3-Clause"],
  "depends": ["glibc", "openssl", "pam", "krb5", "libedit", "zlib"],
  "optdepends": ["xorg-xauth: X11 forwarding"],
  "provides": [],
  "conflicts": [],
  "replaces": [],
  "groups": [],
  "backup": ["etc/ssh/sshd_config", "etc/ssh/ssh_config", "etc/pam.d/sshd"],
  "options": [],
  "origin": { "native_pkg": "openssh-server", "native_distro": "debian" },
  "files": ["/usr/bin/ssh", "/usr/sbin/sshd", "/etc/ssh/sshd_config", "..."],
  "scriptlet": {
    "needed": false,
    "post_install": [],
    "post_upgrade": [],
    "post_remove": []
  },
  "source_build": null,
  "notes": "Merged Debian openssh-server + openssh-client + openssh-sftp-server."
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `pkgname` | yes | ALPM package name (`[A-Za-z0-9@._+-]`, no leading `-`/`.`). |
| `kind` | yes | `leaf` (carries files) or `meta` (grouping only). |
| `strategy` | leaves | `binary` (repackage installed bytes), `source` (from-source scaffold), `virtual` (no payload). Metas are implicitly `virtual`. |
| `pkgver` | yes | Upstream version, sanitized: no `: / -` or whitespace. |
| `pkgrel` | inherits | Distribution release integer; default from `defaults.pkgrel`. |
| `epoch` | no | Positive integer; only when version ordering is otherwise broken. |
| `pkgdesc` | yes | One line, ≤80 chars, no self-reference. |
| `arch` | leaves | `["x86_64"]` etc. for binary leaves; `["any"]` for metas/arch-independent payloads. |
| `url`, `license` | recommended | `license` uses SPDX identifiers. |
| `depends` … `replaces` | no | ALPM relation arrays. `depends` lists first-level deps explicitly. |
| `groups` | no | Pacman group labels. Complementary to — not a substitute for — meta-packages. |
| `backup` | no | Config paths (no leading slash) preserved across upgrade/remove. |
| `options` | no | makepkg `options` overrides (e.g. `!strip`, `!debug`). |
| `origin` | leaves | Provenance: the native package and distro a binary leaf was carved from, or `null` for synthetic leaves. |
| `files` | binary/source leaves | Absolute paths (relative to target root) this package owns. |
| `scriptlet` | no | `.install` content; see below. |
| `source_build` | source leaves | `{ "upstream_url": "...", "tarball": "...", "build": ["TODO"], "package": ["TODO"] }`. `null` otherwise. |
| `notes` | no | Free text for the human reviewer. |

### `scriptlet`

Only populate when an action is genuinely package-specific and **not** already
covered by a pacman hook from the `systemd` package. See
`systemd-taxonomy.md` — daemon-reload / sysusers / tmpfiles / udev-reload are
hook territory, not scriptlet territory. Each `post_*` is an array of shell
lines inserted into the corresponding install-script function.

## MetaTree

The meta-package tree is declared once, separately from the flat `packages`
array, and cross-references entries by `pkgname`. Every node named here must
also exist as a `kind: "meta"` entry in `packages` (or `plan.sh`/`emit.sh` will
flag a closure error).

```json
"tree": {
  "root": "hyp-system",
  "nodes": {
    "hyp-system":   { "depends": ["hyp-base", "hyp-virt", "hyp-net", "hyp-mgmt"] },
    "hyp-base":     { "depends": ["filesystem", "glibc", "systemd", "bash", "..."] },
    "hyp-virt":     { "depends": ["qemu-base", "libvirt", "edk2-ovmf"] },
    "hyp-net":      { "depends": ["hyp-net-core"], "leaves": ["iproute2", "nftables"] },
    "hyp-mgmt":     { "depends": [], "leaves": ["hyp-tenant-manager", "hyp-portable-tools"] }
  }
}
```

- `root` — the single top-level meta a machine installs to get the whole OS.
- `nodes[name].depends` — other meta-package names (the layering edges).
- `nodes[name].leaves` — optional convenience list of regular packages this meta
  pulls in directly. `emit.sh` folds `leaves` into the meta's `depends=()`.

Design the tree to mirror the system's **architecture**, not its directory
layout: layers a reader would recognize as subsystems. Higher metas depend on
lower metas; leaves attach at the layer that owns them. Keep it shallow — two
or three levels is almost always enough.

## Minimal example

A two-package set: one base meta plus one binary leaf.

```json
{
  "schema": "https://bitbuilder.cloud/schemas/repackage-manifest/v1.0.0",
  "target": { "form": "rootfs", "root": "/mnt/t", "distro": "alpine",
              "os_release_id": "alpine", "arch": "x86_64" },
  "defaults": { "pkgrel": 1, "packager": "Daniel Bodnar <daniel@bodnar.sh>",
                "strategy": "binary" },
  "packages": [
    { "pkgname": "appliance-system", "kind": "meta", "strategy": "virtual",
      "pkgver": "1.0.0", "pkgdesc": "Appliance OS meta-package",
      "arch": ["any"], "depends": ["busybox-repack"] },
    { "pkgname": "busybox-repack", "kind": "leaf", "strategy": "binary",
      "pkgver": "1.36.1", "pkgdesc": "Repackaged BusoyBox userland",
      "arch": ["x86_64"], "license": ["GPL-2.0-only"],
      "origin": { "native_pkg": "busybox", "native_distro": "alpine" },
      "files": ["/bin/busybox"], "depends": [] }
  ],
  "tree": { "root": "appliance-system",
            "nodes": { "appliance-system": { "depends": ["busybox-repack"] } } }
}
```
