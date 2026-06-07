#!/usr/bin/env bun
// add command -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("add", "command", Bun.argv.slice(2));
