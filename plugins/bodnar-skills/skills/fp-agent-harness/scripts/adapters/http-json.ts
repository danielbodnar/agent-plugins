// adapters/http-json.ts — a generic Executor for any JSON-over-HTTP model server.
//
// No provider is named. The endpoint, the headers, the request shape, and the
// path to the completion text in the response are all read from the agent's
// closure. One adapter covers most hosted and local model servers, because what
// differs between them is configuration, not code.
//
// Expected closure fields (all optional except endpoint):
//   endpoint     string   the URL to POST to
//   headers      object   header name to value; read credentials from env here
//   model        string   passed through into the request body
//   temperature  number   passed through into the request body
//   maxTokens    number   passed through into the request body
//   bodyShape    "messages" | "prompt"   how to place the instruction (default messages)
//   replyPath    string[] path into the JSON response holding the text
//                         (default ["choices", "0", "message", "content"])

import type { Executor, Closure } from "../lib/core.ts";

const dig = (obj: unknown, path: string[]): string => {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[key];
    else return "";
  }
  return typeof cur === "string" ? cur : "";
};

const buildBody = (rendered: string, c: Closure) => {
  const base: Record<string, unknown> = {};
  if (c.model) base.model = c.model;
  if (typeof c.temperature === "number") base.temperature = c.temperature;
  if (typeof c.maxTokens === "number") base.max_tokens = c.maxTokens;
  if (c.bodyShape === "prompt") {
    base.prompt = rendered;
  } else {
    base.messages = [{ role: "user", content: rendered }];
  }
  return base;
};

export const httpJsonAdapter: Executor = async (rendered, closure) => {
  const endpoint = closure.endpoint as string | undefined;
  if (!endpoint) throw new Error("http-json adapter: closure.endpoint is not set");
  const headers = {
    "content-type": "application/json",
    ...((closure.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(buildBody(rendered, closure)),
  });
  if (!res.ok) {
    throw new Error(`http-json adapter: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const path =
    (closure.replyPath as string[] | undefined) ??
    ["choices", "0", "message", "content"];
  return dig(data, path);
};
