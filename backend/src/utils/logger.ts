interface LogFields {
  [key: string]: unknown;
}

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}): void {
  const entry = { level, event, ...fields, timestamp: new Date().toISOString() };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};
