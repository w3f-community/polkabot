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

    // var myCustomLevels = {
    //   levels: { 
    //     emerg: 0, 
    //     alert: 1, 
    //     crit: 2, 
    //     error: 3, 
    //     warning: 4, 
    //     notice: 5, 
    //     info: 6, 
    //     debug: 7,
    //     silly: 8,
    //     trace: 9
    //   },
    //   colors: {
    //     emerg: 'redBG yellow', 
    //     alert: 'redBG grey', 
    //     crit: 'redBG white', 
    //     error: 'red', 
    //     warning: 'orange', 
    //     notice: 'cyan', 
    //     info: 'blue', 
    //     debug: 'white',
    //     silly: 'grey',
    //     trace: 'greenBG red'
    //   }
    // };
    // winston.addColors(myCustomLevels.colors);
    const instance = createLogger({
      level: process.env.LOG_LEVEL,
      format: combine(
        label({ label: source }),
        format.splat(),
        // format.json(),
        // timestamp(),
        productionFormat,
      ),
      // levels: myCustomLevels.levels,
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
          format.colorize(),
          format.align(),
          format.simple(),
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
