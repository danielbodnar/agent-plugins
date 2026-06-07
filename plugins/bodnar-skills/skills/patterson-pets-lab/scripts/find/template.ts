#!/usr/bin/env bun
// find template -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("find", "template", Bun.argv.slice(2));
