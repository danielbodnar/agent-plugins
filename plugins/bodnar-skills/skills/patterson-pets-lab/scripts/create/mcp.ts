#!/usr/bin/env bun
// create mcp -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "mcp", Bun.argv.slice(2));
