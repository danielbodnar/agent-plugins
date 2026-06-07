#!/usr/bin/env bun
// create reference -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "reference", Bun.argv.slice(2));
