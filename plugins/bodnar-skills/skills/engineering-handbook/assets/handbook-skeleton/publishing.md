# Publishing this handbook

How this handbook is built, deployed, and maintained as a live site.

**Generator:** [TBD; see `references/publishing.md` in the engineering-handbook skill for options]
**Hosting:** [TBD]
**Live URL:** [TBD once deployed]
**Source of truth:** the `handbook/` directory in this repo
**Deploy trigger:** [TBD; typically push to `main` that touches `handbook/**`]
**DRI:** [TBD]

## Updating content

Edit a markdown file in `handbook/`, open a PR, get review, merge. Deployment is automatic.

## Updating the site itself (theme, navigation, build)

[TBD; depends on chosen generator. See `references/publishing.md` in the engineering-handbook skill.]

## Rolling back

Revert the merge commit. The previous build redeploys.

---

**This file is required.** A handbook with no documented deploy story tends to drift out of sync with what readers actually see. If this file is missing details, the next person to deploy is on the hook to fill them in.
