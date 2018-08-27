import 'babel-core/register'
import 'babel-polyfill'

import pkg from '../package.json'
import { User } from './lib/lib'

function main () {
  const bob = new User('bob')
  console.log(bob.hello())
}

main()
