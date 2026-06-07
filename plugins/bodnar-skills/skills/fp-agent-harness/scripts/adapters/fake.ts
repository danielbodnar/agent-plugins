// adapters/fake.ts — an offline Executor.
//
// You supply a reply function; no network is touched. This adapter is a peer
// of every other; it is what makes the kernel and a whole pipeline runnable
// deterministically with zero cost. Tests and dry runs use it.

import type { Executor } from "../lib/core.ts";

export const fakeAdapter = (reply: (rendered: string) => string): Executor => {
  return async (rendered) => reply(rendered);
};
