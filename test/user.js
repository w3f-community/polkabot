import chai from 'chai'
import chaiHttp from 'chai-http'
import { User } from '../src/lib/lib'

const should = chai.should()

describe('User', () => {
  it('Should say hello', (done) => {
    const hello = new User('bob').hello()
    hello.should.equal('Hello bob')
    done()
  })
})
