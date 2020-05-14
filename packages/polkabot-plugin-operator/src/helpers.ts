
/**
 * Parse a given message to figure out whether the user needs help
 * @param msg the message to parse
 */
export function isHelpNeeded(msg: string) : boolean {
    return msg.indexOf('!') < 0 && msg.toLowerCase().indexOf('help') >= 0
}