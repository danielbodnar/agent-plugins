#!/usr/bin/env bun
// edit template -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("edit", "template", Bun.argv.slice(2));
