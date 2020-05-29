/**
 * Capitalize the first char of a string
 * @param s The string to captitalize
 */
export function capitalize(s: string): string {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Fetch the class of an object to reach its static members and access the commands
 * @param object 
 */
export function getClass<T extends Function>(object: Record<string, any>): T {
  return (object.constructor) as T;
}