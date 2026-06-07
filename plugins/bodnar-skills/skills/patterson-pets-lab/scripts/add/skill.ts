#!/usr/bin/env bun
// add skill -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("add", "skill", Bun.argv.slice(2));
