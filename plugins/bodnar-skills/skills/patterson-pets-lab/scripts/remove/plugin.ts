#!/usr/bin/env bun
// remove plugin -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "plugin", Bun.argv.slice(2));
