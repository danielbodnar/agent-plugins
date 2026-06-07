#!/usr/bin/env bun
// remove mcp -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "mcp", Bun.argv.slice(2));
