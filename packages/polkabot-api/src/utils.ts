
/**
 * If something goes wrong, this method will make it visible as it happens!
 * @param statement Statement to be tested
 * @param message If the statement is false, throw an Error with this message
 */
export function assert(statement: boolean, message: string): void {
  if (!statement) throw new Error(message || 'Assertion failed');
}
