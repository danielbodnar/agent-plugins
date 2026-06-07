# classify-deps

```json
{
  "name": "classify-deps",
  "closure": {},
  "constraints": [
    "runtime holds packages shipped to production.",
    "tooling holds build, test, lint, and type packages.",
    "Every input package appears in exactly one list."
  ],
  "schema": { "runtime": "string[]", "tooling": "string[]" }
}
```

Sort these package names into runtime and tooling.

{{input}}
