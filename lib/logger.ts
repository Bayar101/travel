// Structured JSON logger. One JSON line per call. Never pass secrets in fields.

type Level = "DEBUG" | "INFO" | "WARN" | "ERROR";
type Fields = Record<string, unknown>;
type LogFn = (message: string, fields?: Fields, err?: unknown) => void;

export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

const SERVICE = "trip-planner";

function serializeError(err: unknown): Fields {
  if (err instanceof Error) {
    return { error_name: err.name, error_message: err.message, error_stack: err.stack };
  }
  return { error_name: "NonError", error_message: String(err) };
}

export function createLogger(name: string): Logger {
  const emit = (level: Level, message: string, fields?: Fields, err?: unknown) => {
    const env = process.env.NODE_ENV ?? "development";
    if (level === "DEBUG" && env === "production") return;
    const record = {
      ...fields,
      ...(err !== undefined ? serializeError(err) : {}),
      "@timestamp": new Date().toISOString(),
      level,
      message,
      service: SERVICE,
      env,
      request_id: typeof fields?.request_id === "string" ? fields.request_id : null,
      logger: name,
    };
    const line = JSON.stringify(record);
    if (level === "ERROR") console.error(line);
    else console.log(line);
  };
  return {
    debug: (m, f, e) => emit("DEBUG", m, f, e),
    info: (m, f, e) => emit("INFO", m, f, e),
    warn: (m, f, e) => emit("WARN", m, f, e),
    error: (m, f, e) => emit("ERROR", m, f, e),
  };
}

/**
 * Copy of `err` safe to log when its message may embed user data (URLs, names): same name and
 * stack frames, but the message (and the message lines heading the stack) replaced by `message`.
 */
export function redactError(err: unknown, message: string): Error {
  const safe = new Error(message);
  safe.name = err instanceof Error ? err.name : "NonError";
  const frames = err instanceof Error && err.stack ? err.stack.split("\n").filter((l) => /^\s+at /.test(l)) : [];
  safe.stack = [`${safe.name}: ${message}`, ...frames].join("\n");
  return safe;
}
