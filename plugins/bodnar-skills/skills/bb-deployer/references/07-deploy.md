# Phase 7: Deploy

The goal is a live URL on BitBuilder Cloud serving the translated app, with bindings provisioned, secrets set, custom domain wired, and the live surface smoke-verified.

## Account selection

Confirm wrangler is logged into the BitBuilder account:

```bash
bunx wrangler whoami
```

When the wrong account is active, switch with `bunx wrangler logout` followed by `bunx wrangler login`, and then re-check.

When Daniel runs deploys non-interactively (CI, scripts), export the API token and account ID from 1Password before invoking wrangler:

```bash
export CLOUDFLARE_API_TOKEN=$(op read "op://Vault/Cloudflare BitBuilder/api_token")
export CLOUDFLARE_ACCOUNT_ID=$(op read "op://Vault/Cloudflare BitBuilder/account_id")
```

The exact 1Password vault and item names depend on Daniel's setup; ask him for the path if it is not obvious.

## Provision bindings

For every binding in `bb-deployer-spec.json.bindings`, create the remote resource and update `wrangler.jsonc` with the returned identifier.

**D1.**

```bash
cd apps/api
bunx wrangler d1 create <project-name>-db
```

Copy the printed `database_id` into the matching `d1_databases[].database_id` field in `wrangler.jsonc`.

Apply migrations:

```bash
bunx wrangler d1 migrations apply <project-name>-db --remote
```

For local dev, also run with `--local`.

**KV.**

```bash
bunx wrangler kv namespace create <NAME>
```

Copy the printed namespace ID into the matching `kv_namespaces[].id` field.

**R2.**

```bash
bunx wrangler r2 bucket create <project-name>
```

The bucket name is the identifier; no ID copy needed beyond confirming the binding's `bucket_name` matches.

**Durable Objects.** The binding lives in `wrangler.jsonc` under `durable_objects.bindings`. The class itself is defined in the Worker source. Add a migrations block on first deploy:

```jsonc
"durable_objects": {
  "bindings": [{ "name": "ROOM", "class_name": "Room" }]
},
"migrations": [{ "tag": "v1", "new_classes": ["Room"] }]
```

**Queues.** Producer and consumer bindings both live in `wrangler.jsonc`. Producer binding is `queues.producers`, consumer binding is `queues.consumers`. Create the queue:

```bash
bunx wrangler queues create <queue-name>
```

**Vectorize.** Create the index with the dimensions appropriate to the embedding model:

```bash
bunx wrangler vectorize create <index-name> --dimensions=1024 --metric=cosine
```

Then add the binding in `wrangler.jsonc` under `vectorize`.

**Workers AI.** No remote provisioning. The binding `ai` just needs to be present in `wrangler.jsonc`.

After every `wrangler.jsonc` edit, regenerate types:

```bash
bunx wrangler types
```

Commit the updated `wrangler.jsonc` and generated types together.

## Set secrets

For every secret in `spec.secrets` whose `source` is `"op-env"`, pipe directly from 1Password:

```bash
op read "op://Vault/<project>/<name>" | bunx wrangler secret put <NAME>
```

For secrets whose source is `"prompt"`, run interactively:

```bash
bunx wrangler secret put <NAME>
# paste value when prompted
```

For secrets whose source is `"later"`, skip them. The deploy will succeed and the secret can be added when needed.

## Deploy the Worker

From `apps/api/`:

```bash
cd apps/api
bun run build
bunx wrangler deploy
```

When the deploy succeeds, wrangler prints the deployed URL (`<worker-name>.<subdomain>.workers.dev`). Capture it.

## Configure the custom domain

When `spec.deploy.customDomain` is null, the default is `<project-name>.bitbuilder.cloud`. Two paths to get there:

**Route-based.** Add a `routes` block to `wrangler.jsonc`:

```jsonc
"routes": [
  {
    "pattern": "<project-name>.bitbuilder.cloud/*",
    "zone_name": "bitbuilder.cloud"
  }
]
```

Then redeploy with `bunx wrangler deploy`. Wrangler will provision the route on the bitbuilder.cloud zone.

**Custom domain (Workers Custom Domains).** Run `bunx wrangler dev` first, then go to the Cloudflare dashboard and add a Custom Domain for the Worker. Wrangler's CLI for Custom Domains is available too:

```bash
bunx wrangler triggers deploy
```

In both cases the subdomain must resolve. When the DNS record for `<project-name>.bitbuilder.cloud` does not exist in the bitbuilder.cloud zone, create it as a CNAME pointing to the Worker's `<subdomain>.workers.dev` with proxy enabled.

## Smoke verify

```bash
curl -sS https://<project-name>.bitbuilder.cloud/ | head -20
```

Open the URL in a browser. Click through the same flows you exercised in Phase 5. Compare to the original artifact.

For continuous logs during verification:

```bash
bunx wrangler tail
```

In a second terminal, exercise the deployed app. Errors surface in real time. Fix any that appear before declaring the deploy done.

## CI secrets

When the GitHub Actions deploy workflow is in use, Daniel needs to set repo secrets once:

```bash
gh secret set CLOUDFLARE_API_TOKEN < <(op read "op://Vault/Cloudflare BitBuilder/api_token")
gh secret set CLOUDFLARE_ACCOUNT_ID --body "$(op read 'op://Vault/Cloudflare BitBuilder/account_id')"
```

After setting, the next push to main will trigger a deploy via `cloudflare/wrangler-action@v3`.

## Run smoke tests against production

When Playwright is configured (Phase 6), run the smoke suite against the deployed URL:

```bash
SMOKE_URL=https://<project-name>.bitbuilder.cloud bunx playwright test
```

This is the final regression check before declaring deploy successful.

## Commit and push

```bash
git add wrangler.jsonc apps/api/worker-configuration.d.ts
git commit -m "deploy: provision bindings and deploy to BitBuilder"
git push
```

## What to skip

No custom CDN configuration beyond what `wrangler.jsonc` declares. No edge rules outside the Worker. No custom cache rules. Stay thin; if the artifact needs more than Workers can do natively, that surfaced in Plan and was already resolved.

## When to stop and ask

When `wrangler deploy` fails on account permissions, ask Daniel to verify the API token scope includes Workers Scripts and the relevant bindings. When DNS does not resolve for the bitbuilder.cloud subdomain, ask him to confirm the zone has the expected nameservers active.

Do not retry-loop on permission or DNS failures. They are configuration problems, not transient errors, and looping just burns time.
