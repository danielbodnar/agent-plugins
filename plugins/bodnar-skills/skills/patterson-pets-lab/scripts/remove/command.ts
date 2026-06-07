#!/usr/bin/env bun
// remove command -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "command", Bun.argv.slice(2));
