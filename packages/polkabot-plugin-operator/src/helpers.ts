
/**
 * Parse a given message to figure out whether the user needs help
 * @param msg the message to parse
 */
export function isHelpNeeded(msg: string): boolean {
  if (!msg) return false;
  return msg.toLowerCase().indexOf('help') >= 0;
}

/**
 * Once the bot start, it can contact the Operator.
 * First of all, that lets the Operator know that the bot is up.
 * Second, this will open the communication channel with the bot.
 * The Operator used to be able to contact the bot but this
 * is nowadays more complicated as e2e is enabled by default in clients such as Riot.
 */
export function contactOperator() {
  throw new Error('Not implemented');
}