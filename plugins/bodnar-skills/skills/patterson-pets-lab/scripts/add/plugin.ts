#!/usr/bin/env bun
// add plugin -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("add", "plugin", Bun.argv.slice(2));
