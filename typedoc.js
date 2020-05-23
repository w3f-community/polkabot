module.exports = {
  name: 'PolkaBOT',
  exclude: '**/*+(index|e2e|spec|types).ts',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: false,
  excludeProtected: false,
  hideGenerator: true,
  includeDeclarations: false,
  module: 'commonjs',
  moduleResolution: 'node',
  out: 'public/doc',
  stripInternal: 'false'
};