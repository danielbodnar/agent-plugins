#!/usr/bin/env bun
// create skill -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "skill", Bun.argv.slice(2));
