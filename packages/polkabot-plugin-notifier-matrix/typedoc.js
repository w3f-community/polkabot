const name = 'PolkaBOT Plugin Notifier Matrix'

let base = require('../../typedoc');
const folder = name.toLowerCase().replace(/ /g, '-')
module.exports = {
  ...base,
  name,
  out: '../../public/doc/' + folder,
};
