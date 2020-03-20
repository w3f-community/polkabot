export function assert(val, msg): void {
  if (!val) throw new Error(msg || 'Assertion failed');
}
