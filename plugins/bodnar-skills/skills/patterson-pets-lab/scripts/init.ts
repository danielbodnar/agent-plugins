#!/usr/bin/env bun
// init -- scaffold a new Patterson AI Pets repository (a pet is a skill) and serve
// as the dispatcher for the filesystem-routed CLI.
//
// As a scaffolder:   bun scripts/init.ts <pet-name>
// As a dispatcher:   bun scripts/init.ts <verb> <entity> <name>   (e.g. create skill my-pet)
//
// The dispatcher path keeps a single entry point for tooling that prefers one
// binary; the leaf scripts under create/ find/ add/ remove/ edit/ remain runnable
// directly for shell-completion and muscle memory.

import { join } from "node:path";
import { runVerb, type Verb } from "./lib/crud.ts";
import { writeFile } from "./lib/fs.ts";
import { die, log } from "./lib/log.ts";
import { positional } from "./lib/paths.ts";
import { ENTITIES, resolveEntity } from "./lib/entities.ts";

const VERBS = new Set<Verb>(["create", "find", "add", "remove", "edit"]);

async function scaffoldRepo(petName: string): Promise<void> {
  const root = join(process.cwd(), petName);
  log.step(`scaffolding pet repository at ${root}`);

  await writeFile(join(root, "SKILL.md"), ENTITIES.skill.scaffold(petName));
  await writeFile(join(root, "AGENTS.md"), `# ${petName}\n\n[Pet conventions, the agent it runs under, and gotchas the team has found.]\n`);
  await writeFile(join(root, "README.md"), `# ${petName}\n\n[Team, visual identity, link to the Show, how to contribute. Human-facing; lives outside the skill body.]\n`);
  await writeFile(join(root, "references", "approach.md"), `# Approach\n\n[The pet's strategy. Loaded on demand, not on every invocation.]\n`);
  await writeFile(join(root, "assets", "lore.md"), `# Lore\n\n[Backstory, breed, personality. Non-technical contributors edit this for design points.]\n`);
  await writeFile(join(root, "scripts", "verify.ts"), `#!/usr/bin/env bun\n// Local hygiene checks the judge will run. Make submission green here first.\nconsole.log("verify: implement the checks the rubric scores");\n`);
  await writeFile(join(root, ".github", "workflows", "submit.yml"), `name: submit\non:\n  push:\n    branches: [main]\njobs:\n  submit:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo "open a PR to the Show repository"\n`);

  log.ok(`pet "${petName}" scaffolded. Next: edit SKILL.md, then \`bunx patterson-skill-creator validate .\``);
}

const argv = Bun.argv.slice(2);
const first = argv[0];

if (first && VERBS.has(first as Verb)) {
  const entity = argv[1];
  if (!entity || !(entity in ENTITIES)) die(`usage: init <verb> <entity> <name>\nentities: ${Object.keys(ENTITIES).join(", ")}`);
  resolveEntity(entity); // validate
  await runVerb(first as Verb, entity, argv.slice(2));
} else {
  const [petName] = positional(argv);
  if (!petName) die("usage: init <pet-name>   (or)   init <verb> <entity> <name>");
  await scaffoldRepo(petName);
}
