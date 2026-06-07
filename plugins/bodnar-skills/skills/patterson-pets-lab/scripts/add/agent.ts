#!/usr/bin/env bun
// add agent -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("add", "agent", Bun.argv.slice(2));
