import LoggerSingleton from '@polkabot/api/src/LoggerFactory';
const Logger = LoggerSingleton.getInstance();

/**
 * This method decorator allows easily adding tracing.
 * @param msg 
 */
export function Trace(msg?: string) {
  return function (target: any, methodName: string, _descriptor: PropertyDescriptor) {
    const cls = target.constructor;
    Logger.silly('TRACE: %s:%s%s', cls.name, methodName, msg? ` - ${msg}` : '');
    // TODO: wrong, here we trace when the DECORATOR runs, what we want is to inject code in the target method 
  };
}

