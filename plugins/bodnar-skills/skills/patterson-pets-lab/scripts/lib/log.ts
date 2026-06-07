// Minimal structured logger. No dependencies, ANSI only when stdout is a TTY.

const tty = process.stdout.isTTY ?? false;
const paint = (code: string, text: string) => (tty ? `\x1b[${code}m${text}\x1b[0m` : text);

export const log = {
  info: (msg: string) => console.error(paint("36", "i") + " " + msg),
  ok: (msg: string) => console.error(paint("32", "+") + " " + msg),
  warn: (msg: string) => console.error(paint("33", "!") + " " + msg),
  err: (msg: string) => console.error(paint("31", "x") + " " + msg),
  step: (msg: string) => console.error(paint("35", "->") + " " + msg),
  // Machine-readable results go to stdout so callers can pipe them.
  out: (data: unknown) => console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2)),
};

export function die(msg: string, code = 1): never {
  log.err(msg);
  process.exit(code);
}
