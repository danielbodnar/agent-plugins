#!/usr/bin/env bun
// find command -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "command", Bun.argv.slice(2));
