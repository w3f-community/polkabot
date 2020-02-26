import { ConfigSpecs } from '../src/types';
import { SpecsFactory } from '../src/SpecsFactory';

const prefix = 'SAMPLE';
const mod = 'MODULE';
// let specs: ConfigSpecs = {
//   container: {
//     prefix,
//     module: mod,
//   },
//   config: {},
// };
export let param;

const factory = new SpecsFactory({ prefix, module: mod });

factory.appendSpec(factory.getSpec('PARAM1', 'some param1'));
factory.appendSpec(factory.getSpec('PARAM2', 'some param2'));
factory.appendSpec(factory.getSpec('SECRET', 'some secret', { masked: true }));
factory.appendSpec(factory.getSpec('REGEXP', 'some regexp', { regexp: /^\d{2}_\d{2}/ }));
factory.appendSpec(factory.getSpec('MANDAT1', 'some mandatory param', { mandatory: true }));
// specs = factory.appendSpec(specs, factory.getSpec('REGEXP', 'some regexp', /^\d{2}_\d{2}/));
const specs = factory.getSpecs()

export default specs;
