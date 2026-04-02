import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        },
      }
    : {}),
});

export const log = {
  info:  (msg: string, data?: Record<string, unknown>) => logger.info(data ?? {}, msg),
  warn:  (msg: string, data?: Record<string, unknown>) => logger.warn(data ?? {}, msg),
  error: (msg: string, err?: unknown, data?: Record<string, unknown>) =>
    logger.error({ err, ...data }, msg),
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug(data ?? {}, msg),
};
