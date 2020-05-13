const { createLogger, format, transports } = require('winston');
import { Logger } from 'winston';
import winston from 'winston';
export { winston };

// import winston from "winston/lib/winston/config";
const { combine, timestamp, label, printf } = format;

export default class LoggerSingleton {
    private static instance: Logger;

    public static getInstance(source: string = 'Polkabot'): Logger {
        if (!LoggerSingleton.instance) {
            // const _colorizer = format.colorize();

            const consoleFormat = printf(({ level, message, label, timestamp, meta }) => {
                return `${timestamp} [${label}${meta ? '|' + meta : ''}] ${level}: ${message}`;
            });

            LoggerSingleton.instance = createLogger({
                level: process.env.LOG_LEVEL,
                format: combine(
                    label({ label: source }),
                    format.splat(),
                    format.json(),
                    timestamp(),
                ),
                defaultMeta: { source: 'Polkabot' },
                transports: [
                    //
                    // - Write to all logs with level `info` and below to `combined.log` 
                    // - Write all logs error (and below) to `error.log`.
                    //
                    new transports.File({ filename: 'error.log', level: 'error' }),
                    new transports.File({ filename: 'combined.log' })
                ]
            });

            if (process.env.NODE_ENV !== 'production') {
                LoggerSingleton.instance.add(new transports.Console({
                    format: combine(
                        // format.colorize(),
                        format.align(),
                        timestamp(),
                        format.simple(),
                        format.colorize(),
                        label({ label: source }),
                        format.splat(),
                        consoleFormat,
                    )
                }));
            }
        }

        return LoggerSingleton.instance
    }
}
