import { expect } from 'chai';
import { Callable, Command } from '../src/decorators';
import { Controllable } from '../src/types';

@Callable({ name: 'Foo', alias: 'bar' })
class TestClass1 {
  @Command()
  cmdTest(): void { return; }
}

@Callable()
class TestClass2 {
  @Command()
  cmdTest1(): void { return; }

  @Command()
  cmdTest2(): void { return; }

  @Command({ name: 'test' })
  sometest(): void { return; }
}

describe('Decorators', () => {
  it('TestClass1', () => {
    const CtrlClass = (TestClass1 as unknown as Controllable)
    expect(CtrlClass.meta.alias).not.to.be.undefined;
    expect(CtrlClass.meta.name).to.eql('Foo');
    expect(CtrlClass.meta.alias).to.eql('bar');
    expect(CtrlClass.getCommands()).to.be.lengthOf(1);
  });

  it('TestClass2', () => {
    const CtrlClass = (TestClass2 as unknown as Controllable)

    expect(CtrlClass.meta.alias).not.to.be.undefined;
    expect(CtrlClass.meta.name).to.eql('TestClass2');
    expect(CtrlClass.meta.alias).to.eql('testclass2');
    expect(CtrlClass.getCommands()).to.be.lengthOf(3);
  });
});
