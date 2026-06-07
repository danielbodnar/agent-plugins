#!/usr/bin/env bun
// edit command -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "command", Bun.argv.slice(2));
