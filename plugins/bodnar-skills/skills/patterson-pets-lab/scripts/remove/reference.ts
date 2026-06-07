#!/usr/bin/env bun
// remove reference -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "reference", Bun.argv.slice(2));
