import { expect } from 'chai';
import { PolkabotChatbot } from '../../polkabot-api/src/PolkabotChatbot';

describe('Command parser should pass', function() {
  [
    {
      mod: '!mod',
      cmd: 'cmd',
      argStr: 'arg1 arg2=18',
      args: ['arg1', 'arg2=18']
    },
    {
      mod: '!mod',
      cmd: 'cmd',
      argStr: '',
      args: null
    }
  ].forEach((value, index) => {
    const { mod, cmd, argStr, args } = value;
    const command = `${mod} ${cmd}${argStr ? ' ' + argStr : ''}`;
    it(`Parsing test ${index}: ${command}`, done => {
      const msg = command;
      const res = PolkabotChatbot.getBotCommand(msg);

      expect(res.module).equal(mod.replace('!', ''));
      expect(res.command).equal(cmd);
      expect(res.args).to.deep.equal(args);
      done();
    });
  });
});

describe('Command parser should fail', function() {
  [
    {
      mod: '!',
      cmd: '',
      argStr: 'arg1 arg2=18'
    },
    {
      mod: '!mod',
      cmd: '',
      argStr: ''
    },
    {
      mod: 'junk',
      cmd: '',
      argStr: ''
    }
  ].forEach((value, index) => {
    const { mod, cmd, argStr } = value;
    const command = `${mod} ${cmd}${argStr ? ' ' + argStr : ''}`;
    it(`Parsing test ${index}: ${command}`, done => {
      const msg = command;
      const res = PolkabotChatbot.getBotCommand(msg);

      expect(res).to.be.null;
      done();
    });
  });
});
