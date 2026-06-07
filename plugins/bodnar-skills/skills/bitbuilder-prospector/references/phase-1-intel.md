# Phase 1: Intelligence gathering

## Objective

Capture three parallel intelligence streams about the target: tech
stack (Radar), content (wget mirror), TLS posture (openssl). Upload
the mirror to R2 for durability.

## Inputs

- `state.json`
- `TARGET_URL`
- `apex_domain`

## Actions

Run three tasks in parallel, then consolidate.

### 1a. Radar URL scan

Call `cloudflare-radar:create_url_scan` with `TARGET_URL`. Poll
`cloudflare-radar:get_url_scan` until status is `complete` (typically
30-60 seconds; give up after 3 minutes). Save the full result to
`radar-scan.json`.

Extract into `state.json` under `radar`:
- `tech_stack`: CMS, server, framework, analytics
- `tls`: issuer, not_before, not_after
- `hosting`: IP, ASN, hosting provider name
- `redirect_chain`: array of URLs
- `page_weight_bytes`
- `request_count`

These signals inform the email opener in Phase 7.

### 1b. wget mirror

```bash
bash scripts/crawl.sh "{TARGET_URL}" "{apex_domain}" "./leads/{slug}/mirror"
```

The script runs:

```bash
wget --mirror --convert-links --adjust-extension --page-requisites \
     --no-parent --random-wait --wait=1.5 --limit-rate=500k \
     --reject-regex '(/wp-admin/|/wp-json/|\?replytocom=|/feed/?$)' \
     --domains={apex},www.{apex} \
     --level=3 --tries=2 --timeout=20 -e robots=on \
     --user-agent="Mozilla/5.0 (compatible; BitBuilderAudit/1.0; +https://bitbuilder.cloud/about)" \
     -P {output_dir} "{TARGET_URL}"
```

After wget completes, count HTML files and total bytes. If fewer than
3 HTML files OR less than 50KB total, fall back to Browser Rendering:

- Fetch homepage via `clooudflare-browser-run:get_url_html_content`
- Parse nav links, fetch up to 8 pages
- Save each to `./leads/{slug}/rendered/{path}.html`
- Screenshot the homepage to `./leads/{slug}/rendered/home.png`

### 1c. TLS quick-check

```bash
echo | openssl s_client -connect {apex}:443 -servername {apex} 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

Record in `state.json` under `tls_live` (as opposed to `radar.tls`,
which comes from Radar's scan). Both should agree; discrepancies
are worth noting in `decisions.log`.

### Consolidation

Upload mirror to R2 at `mirrors/{slug}/{iso_timestamp}/` preserving
directory structure. Keep the local copy as the working source (it is
faster to access than R2 for downstream extraction).

## Outputs

- `./leads/{slug}/mirror/` (wget output, IMMUTABLE from here forward)
- `./leads/{slug}/rendered/` (if fallback used)
- `./leads/{slug}/radar-scan.json`
- Updated `state.json` with intel findings
- R2 object: `mirrors/{slug}/{iso_timestamp}/...`

## Acceptance criteria

- At least one of (wget, Browser Rendering) produced usable content
- Radar scan completed and has a tech stack
- TLS posture recorded (expired / valid / self-signed / other)
- Mirror uploaded to R2

## Failure modes

| Failure | Response |
|---------|----------|
| Radar scan times out | Continue with wget-only intel; log warning |
| wget blocked AND Browser Rendering fails | Halt run entirely |
| Less than 100 words total extractable text | Halt, ask Daniel if target is right |
| R2 upload fails | Retry 3x, then halt |

## Notes on Radar specifically

Radar URL Scanner gives you the equivalent of what Shodan offers for a
known hostname, minus the internet-wide scanning. Specifically it
returns: DOM snapshot, HAR, screenshot, headers, cookies, redirect
chain, TLS chain, IP/ASN/geo of the host, and technology fingerprints.
For the business-pitch-building use case, this is sufficient. If at
some point a broader tech-stack discovery across a category is needed,
fall back to BuiltWith or Wappalyzer API (not Shodan).
