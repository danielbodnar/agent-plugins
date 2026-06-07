#!/usr/bin/env bun
// edit reference -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "reference", Bun.argv.slice(2));
