#!/usr/bin/env bun
// remove template -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "template", Bun.argv.slice(2));
