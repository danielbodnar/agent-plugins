#!/usr/bin/env bun
// remove agent -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("remove", "agent", Bun.argv.slice(2));
