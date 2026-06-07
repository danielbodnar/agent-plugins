#!/usr/bin/env bun
// create command -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "command", Bun.argv.slice(2));
