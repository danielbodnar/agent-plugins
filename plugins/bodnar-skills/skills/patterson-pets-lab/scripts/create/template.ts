#!/usr/bin/env bun
// create template -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "template", Bun.argv.slice(2));
