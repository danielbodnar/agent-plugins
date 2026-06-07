#!/usr/bin/env bun
// remove skill -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "skill", Bun.argv.slice(2));
