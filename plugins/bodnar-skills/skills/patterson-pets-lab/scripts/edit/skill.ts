#!/usr/bin/env bun
// edit skill -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "skill", Bun.argv.slice(2));
