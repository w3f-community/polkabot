import Reporter, { ReporterCache } from '.';
import { EventRecord } from '@polkadot/types/interfaces/system';

export function buf2hex(buffer: Array<number>): string {
  // buffer is an ArrayBuffer
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('');
}

export function logCache(this: Reporter, cache: ReporterCache, key: string): void {
  this.context.logger.debug(`Cache for ${key} changed: ${cache[key]}`);
}

/**
 * This function filters out events we are not interested in
 * and keep only the events that match the 'observed' dictionnary.
 * @param events The events, unfiltered
 * @param observed A dictionnary describing what events are relevant
 */
export function filterEvents(events: EventRecord[],
  observed: { [key: string]: string[] }): EventRecord[] {

  return events.filter((item: EventRecord) => {
    const { event } = item;
    const observedSection = Object.keys(observed).includes(event.section);
    const observedMethod = observedSection && observed[event.section].includes(event.method);

    return observedSection && observedMethod;
  });
}
