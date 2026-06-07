#!/usr/bin/env bun
// edit mcp -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "mcp", Bun.argv.slice(2));
