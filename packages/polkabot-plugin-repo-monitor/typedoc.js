const name = 'PolkaBOT Repository Monitor'

const base = require('../../typedoc')
const folder = name.toLowerCase().replace(/ /g, '-')
module.exports = {
  ...base,
  name,
  out: '../../public/doc/' + folder
}
