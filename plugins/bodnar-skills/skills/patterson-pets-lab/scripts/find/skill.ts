#!/usr/bin/env bun
// find skill -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "skill", Bun.argv.slice(2));
