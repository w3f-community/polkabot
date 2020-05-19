import { winston } from '../../../polkabot-api/src/logger';
import { logger as mxLogger } from 'matrix-js-sdk/lib/logger';

/**
 * The Matrix JS SDK logger is rather verbose and we don't really want
 * to pollute our output or logs with too many details.
 * This is why we re-reroute the Matrix logger to our winston logger
 * and lower the log levels.
 * @param logger 
 */
export function routeMatrixLogger(logger: winston.Logger): void {
  // Here we rewrite the Matrix SDK logger to redirect to our logger

  // rewrite matrix logger
  mxLogger.info = (...msg) => logger.log({ level: 'silly', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
  mxLogger.log = (...msg) => logger.log({ level: 'silly', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
  mxLogger.warn = (...msg) => logger.log({ level: 'warn', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
  mxLogger.error = (...msg) => logger.log({ level: 'error', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
  mxLogger.trace = (...msg) => logger.log({ level: 'silly', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
  mxLogger.debug = (...msg) => logger.log({ level: 'silly', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
}
