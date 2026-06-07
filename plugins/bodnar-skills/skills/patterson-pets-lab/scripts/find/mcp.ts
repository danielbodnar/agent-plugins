#!/usr/bin/env bun
// find mcp -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "mcp", Bun.argv.slice(2));
