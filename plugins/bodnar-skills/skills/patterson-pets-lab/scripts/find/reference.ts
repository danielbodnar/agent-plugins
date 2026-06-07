#!/usr/bin/env bun
// find reference -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "reference", Bun.argv.slice(2));
