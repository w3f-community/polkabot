module.exports = {
  name: 'PolkaBOT Project',
  exclude: '**/*+(e2e|spec|types).ts',
  excludeExternals: true,
  excludeNotExported: false,
  excludePrivate: false,
  excludeProtected: false,
  hideGenerator: true,
  includeDeclarations: false,
  module: 'commonjs',
  moduleResolution: 'node',
  out: 'public/doc',
  stripInternal: 'false',
  mode: "file",
  inputFiles: ["packages/**/*"]
};