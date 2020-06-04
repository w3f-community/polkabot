import Reporter, { ReporterCache } from '.';

export function buf2hex(buffer: Array<number>): string {
  // buffer is an ArrayBuffer
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('');
}

export function logCache(this: Reporter, cache: ReporterCache, key: string): void {
  this.context.logger.debug(`Cache for ${key} changed: ${cache[key]}`);
}