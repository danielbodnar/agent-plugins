# Zoho Projects API Reference

Field-tested quirks and gotchas for the Zoho Projects REST API at ACT.

## Authentication

- **Token type**: opaque bearer (not JWT, not parseable)
- **Header format**: `Authorization: Zoho-oauthtoken {access_token}`. NOT the standard `Bearer` prefix. This is the most common mistake.
- **Access token lifetime**: 1 hour
- **Refresh token lifetime**: indefinite until revoked
- **Self Client flow** is the simplest: generate a grant code in the browser at `https://api-console.zoho.com`, then exchange for refresh + access tokens with one curl call. No web server needed.

## API Domain

- Accounts: `https://accounts.zoho.com` (or regional equivalent: `.eu`, `.in`, etc.)
- Projects: `https://projectsapi.zoho.com`

## Resource Conventions

- **Tasks** are the high-level abstract items.
- **Issues** are exposed through the **bugs API** (URL contains `/bugs/`, response keys use `bugs[0]`).
- ACT uses "issues" not "bugs" in conversation, but the API path is `/bugs/`.

## Endpoints (V1 path style, used by the bash script)

| Action | Method | Path |
|--------|--------|------|
| Get refresh/access tokens | POST | `{accounts}/oauth/v2/token` |
| List projects | GET | `{api}/restapi/portal/{portal_id}/projects/` |
| Create task | POST | `{api}/restapi/portal/{portal_id}/projects/{project_id}/tasks/` |
| Create issue | POST | `{api}/restapi/portal/{portal_id}/projects/{project_id}/bugs/` |

## V3 API Path Style

The newer V3 API uses `/api/v3/portal/{portal_id}/...` instead. Some MCP servers (like qpiai/zoho-projects-mcp) use V3.

## Required Fields

### Tasks
- `name` (the title)
- `description` (HTML accepted; use `<br>` for line breaks)
- `priority` (None / Low / Medium / High)

### Issues (bugs)
- `title`
- `description` (HTML accepted; use `<br>` for line breaks)
- **DO NOT include `flag`** field on creation. It causes errors.

## Response Parsing

Successful task creation returns:
```json
{
  "tasks": [
    {
      "id_string": "1572268000012345678",
      "key": "INT-42",
      ...
    }
  ]
}
```

Successful issue creation returns:
```json
{
  "bugs": [
    {
      "id_string": "1572268000098765432",
      "key": "INT-43",
      ...
    }
  ]
}
```

The `key` is what humans use (e.g., INT-42). The `id_string` is what the API uses for subsequent operations.

## Rate Limits

- 100 requests per 2 minutes
- Sleep 1.5-2 seconds between calls to stay well under

## Project IDs

Best retrieved via `ZohoProjects_get_projects_list` with `per_page: 200` to avoid pagination issues.

## MCP Tool Names

Use exact namespaced tool names for reliable resolution:
- `zoho:ZohoProjects_get_projects_list`
- `zoho:ZohoProjects_create_a_task`
- `zoho:ZohoProjects_create_issue`

## Known IDs at ACT

| Field | Value |
|-------|-------|
| Portal ID | `710279869` |
| Internal Needs project ID | `1572268000010985429` |
| Sysadmin/IAC project ID | `1572268000006485005` |
| Daniel's user ID (zpuid) | `1572268000000859032` |
