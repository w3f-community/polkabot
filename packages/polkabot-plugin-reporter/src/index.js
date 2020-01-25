import BN from 'bn.js'
import pluginConfig from './config'

// TODO: Will move to hash later on
import xxhash from '@polkadot/util-crypto/xxhash/xxhash64/asHex'

module.exports = class Reporter {
  constructor (pbot) {
    this.pbot = pbot
    this.config = pluginConfig
    this.cache = {}
  }

  start () {
    console.log('Reporter - Starting with config:', this.config)
    this.watchChain().catch((error) => {
      console.error('Reporter - Error subscribing to chain: ', error)
    })
  }

  announce (msg) {
    console.log('Reporter - Announcing: ', msg)
    this.pbot.matrix.sendTextMessage(this.pbot.config.matrix.roomId, msg)
  }

  buf2hex (buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
  }

  async subscribeChainBlockHeader () {
    await this.pbot.polkadot.rpc.chain
      .subscribeNewHead((header) => {
        const KEY = 'blockNumber'
        if (header) {
          this.cache[KEY] = new BN(header.blockNumber, 16)
        }
      })
  }

  async watchMinimumBlockPeriodChanged () {
    console.log('watchMinimumBlockPeriodChanged started')
    await this.pbot.polkadot.query.timestamp.minimumPeriod(minimumPeriod => {
      const KEY = 'minimumPeriod'
      const minimumPeriodNumber = new BN(Number(minimumPeriod))

      if (!this.cache[KEY]) this.cache[KEY] = minimumPeriodNumber
      if (this.cache[KEY] && !(this.cache[KEY].eq(minimumPeriodNumber))) {
        this.cache[KEY] = minimumPeriodNumber
        console.log(`Reporter - minimumPeriod changed to ${minimumPeriodNumber} s`)
        this.announce(`The minimum block period has changed. It is now ${minimumPeriodNumber.toNumber().toFixed(2)} seconds`)
      } else { console.log(`Reporter - minimumPeriod: ${minimumPeriodNumber} s`) }
    })
  }

  async watchMinimumDepositForProposals () {
    await this.pbot.polkadot.query.democracy.minimumDeposit(minimumDeposit => {
      const KEY = 'minimumDeposit'
      const minimumDepositNumber = Number(minimumDeposit)
      console.log('Reporter - Minimum deposit:', minimumDepositNumber)

      if (!this.cache[KEY]) this.cache[KEY] = minimumDepositNumber
      if (this.cache[KEY] && this.cache[KEY] !== (minimumDepositNumber)) {
        this.cache[KEY] = minimumDepositNumber
        console.log(`Reporter - minimumDeposit changed to ${minimumDepositNumber}`)
        this.announce(`The minimum deposit for proposals has changed. It is now ${minimumDepositNumber.toFixed(2)} µDOTs`)
      } else { console.log(`Reporter - minimumDeposit: ${minimumDepositNumber}`) }
    })
  }

  async watchActiveValidatorCount () {
    // const validatorsSubscriptionUnsub = // can be used to unsubscribe
    await this.pbot.polkadot.query.session.validators(validators => {
      const KEY = 'validators'

      if (!this.cache[KEY]) this.cache[KEY] = validators
      if (this.cache[KEY] && this.cache[KEY].length !== validators.length) {
        console.log('Reporter - Active Validator count: ', validators.length)
        this.announce(`Active Validator count has changed from ${this.cache[KEY].length} to ${validators.length}`)
        this.cache[KEY] = validators
      } else { console.log(`Reporter - Active Validator count: ${validators.length}`) }
    })
  }

  async watchValidatorSlotCount () {
    await this.pbot.polkadot.query.staking.validatorCount(validatorCount => {
      const KEY = 'validatorCount'

      if (!this.cache[KEY]) this.cache[KEY] = validatorCount
      if (this.cache[KEY] && this.cache[KEY] !== validatorCount) {
        this.cache[KEY] = validatorCount
        console.log('Reporter - Validator count:', validatorCount.toString(10))
        this.announce(`The number of validator slots has changed. It is now ${validatorCount.toString(10)}`)
      }
    })
  }

  async watchRuntimeCode () {
    await this.pbot.polkadot.query.substrate.code(code => {
      const KEY = 'runtime'
      const hash = xxhash(code)

      if (!this.cache[KEY]) this.cache[KEY] = { hash, code }
      if (this.cache[KEY] && this.cache[KEY].hash !== hash) {
        this.cache[KEY] = { hash, code }
        console.log('Reporter - Runtime Code hash changed:', hash)

        // const codeInHex = '0x' + this.buf2hex(code)
        // console.log('Runtime Code hex changed', codeInHex)

        this.announce(`Runtime code hash has changed. The hash is now ${hash}. The runtime is now ${code ? (code.length / 1024).toFixed(2) : '???'} kb.`)
      } else { console.log(`Reporter - Runtime Code hash: ${hash}`) }
    })
  }

  async watchCouncilVotingPeriod () {
    // we don't alert for changes but store the latest value
    await this.pbot.polkadot.query.council.votingPeriod(votingPeriod => {
      const KEY = 'votingPeriod'

      this.cache[KEY] = new BN(votingPeriod)
      console.log('Reporter - VotingPeriod:', this.cache[KEY].toString(10))
    })
  }

  async watchCouncilMotionsProposalCount () {
    await this.pbot.polkadot.query.councilMotions.proposalCount(proposalCount => {
      const KEY = 'proposalCount'

      const count = new BN(proposalCount)
      if (!this.cache[KEY]) this.cache[KEY] = count
      if (this.cache[KEY] && !(this.cache[KEY].eq(count))) {
        this.cache[KEY] = count

        console.log('Reporter - Proposal count changed:', count.toString(10))
        const id = count.sub(new BN(1))
        this.announce(
          `A new council motion proposal is available (#${id}), check your UI at https://polkadot.js.org/apps/#/democracy.
  You will be able to vote shortly, a new referendum will show up in the UI.`)
      } else { console.log(`Reporter - Proposal count: ${count.toString(10)}`) }
    })
  }

  async watchReferendumCount () {
    await this.pbot.polkadot.query.democracy.referendumCount(referendumCount => {
      const KEY = 'referendumCount'
      console.log('Reporter - referendumCount:', referendumCount.toString(10))

      const count = new BN(referendumCount)
      if (!this.cache[KEY]) this.cache[KEY] = count
      if (this.cache[KEY] && !(this.cache[KEY].eq(count))) {
        this.cache[KEY] = count
        const deadline = this.cache.blockNumber.add(this.cache.votingPeriod)
        const votingTimeInMinutes = parseInt(this.cache.votingPeriod.mul(this.cache.minimumPeriod).toString(10)) / 60
        console.log('Reporter - Referendum count changed:', count.toString(10))
        const id = count.sub(new BN(1)).toString(10)

        this.announce(
          `@room New referendum (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
  You can vote for referendum #${id} during the next ${this.cache.votingPeriod.toString(10)} blocks. 
  That means a deadline at block #${deadline.toString(10)}, don't miss it! 
  You have around ${votingTimeInMinutes.toFixed(2)} minutes to vote.`)
      } else { console.log(`Reporter - Referendum count: ${count.toString(10)}`) }
    })
  }

  async watchChain () {
    await this.subscribeChainBlockHeader()
    await this.watchMinimumBlockPeriodChanged()
    await this.watchMinimumDepositForProposals()
    await this.watchActiveValidatorCount()
    await this.watchValidatorSlotCount()
    await this.watchRuntimeCode()
    await this.watchCouncilVotingPeriod()
    await this.watchCouncilMotionsProposalCount()
    await this.watchReferendumCount()
  }
}
