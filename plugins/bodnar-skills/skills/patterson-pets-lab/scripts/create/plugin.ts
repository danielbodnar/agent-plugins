#!/usr/bin/env bun
// create plugin -- filesystem-routed entry point. All logic lives in ../lib/crud.ts.
import { runVerb } from "../lib/crud.ts";

await runVerb("create", "plugin", Bun.argv.slice(2));
