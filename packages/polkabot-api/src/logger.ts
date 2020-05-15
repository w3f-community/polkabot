import { Logger, createLogger, format, transports } from 'winston';
import winston from 'winston';
export { winston };
const { combine, label, printf } = format;

export default class LoggerFactory {
  public static getInstance(source = 'POLKABOT'): Logger {
    const consoleFormat = printf(({ level, message, label, _timestamp, meta }) => {
      return `[${label}${meta ? '|' + meta.source : ''}]\t${level} ${message}`;
    });

    const productionFormat = printf(({ level, message, label, timestamp, meta }) => {
      return `${timestamp} [${label}${meta ? '|' + meta.source : ''}]\t${level} ${message}`;
    });

    const instance = createLogger({
      level: process.env.LOG_LEVEL,
      format: combine(
        label({ label: source }),
        format.splat(),
        // format.json(),
        // timestamp(),
        productionFormat,
      ),
      transports: [
        // - Write to all logs with level `info` and below to `combined.log` 
        // - Write all logs error (and below) to `error.log`.
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      instance.add(new transports.Console({
        format: combine(
          format.align(),
          format.simple(),
          format.colorize(),
          label({ label: source }),
          format.splat(),
          consoleFormat,
        )
      }));
    }
    // }

    return instance;
  }
}
