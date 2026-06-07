#!/usr/bin/env bun
// add mcp -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("add", "mcp", Bun.argv.slice(2));
