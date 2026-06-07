#!/usr/bin/env bun
// create agent -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "agent", Bun.argv.slice(2));
