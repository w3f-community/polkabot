import { PolkabotChatbot } from '../src/PolkabotChatbot';
import { expect } from 'chai';

describe('PolkabotChatbot', () => {
  it('Should get a valid botCommand #1', () => {
    const cmd = PolkabotChatbot.getBotCommand('!mod foo bar');
    expect(cmd.module).to.equal('mod');
    expect(cmd.command).to.equal('foo');
    expect(cmd.args).to.deep.equal(['bar']);
  });

  it('Should get a valid botCommand #2', () => {
    const cmd = PolkabotChatbot.getBotCommand('!mod foo');
    expect(cmd.module).to.equal('mod');
    expect(cmd.command).to.equal('foo');
    expect(cmd.args).to.be.null;
  });

  it('Should get a valid botCommand with all args', () => {
    const cmd = PolkabotChatbot.getBotCommand('!mod foo bar param=42');
    expect(cmd.module).to.equal('mod');
    expect(cmd.command).to.equal('foo');
    expect(cmd.args).to.deep.equal(['bar', 'param=42']);
  });

  xit('Should get a valid botCommand', () => {
    const cmd = PolkabotChatbot.getBotCommand(' !mod foo bar');
    expect(cmd.module).to.equal('mod');
    expect(cmd.command).to.equal('foo');
    expect(cmd.args).to.be.null;
  });

  it('Should not find a botCommand #1', () => {
    const cmd = PolkabotChatbot.getBotCommand('! mod foo');
    expect(cmd).to.be.null;
  });

  it('Should not find a botCommand #2', () => {
    const cmd = PolkabotChatbot.getBotCommand('!mod');
    expect(cmd).to.be.null;
  });
});
