#!/usr/bin/env bun
// find plugin -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "plugin", Bun.argv.slice(2));
