#!/usr/bin/env bun
// edit agent -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "agent", Bun.argv.slice(2));
